# Moving GrabPic off AWS

**Now:** ~$85/month · **After:** ~$1/month

You are moving two programs from AWS servers onto your own Nitro box. The photos stay on
Amazon S3 (that part costs about a dollar). Your website, login, and database don't move at all.

**No app code gets rewritten.** You don't need to remember how this project works.

---

## The idea in one paragraph

Right now Amazon runs two computers for you 24/7 and charges ~$85/month, even when nobody visits.
One runs the main API, the other runs the face-recognition programs. Your Nitro box is already on
24/7 doing nothing with 24 GB of spare memory. So you move those two jobs onto it. Amazon keeps
storing the actual photo files, which is cheap. Everything else is already free and doesn't get
touched: the website on Vercel, the login and database on Supabase.

---

## What it costs at each stage

| | Per month |
|---|---|
| Now | ~$85 |
| After Step 1 (10 minutes from now) | **~$3–7** |
| After Step 8 (old servers deleted) | **~$1** |

The final ~$1 is Amazon storing your photos, about 2¢ per GB. The $3–7 in between is the stopped
EC2's disk plus an Elastic IP if you have one; both go away at Step 8. SQS, Vercel, Supabase,
Upstash, Turnstile and Cloudflare Tunnel are all free at your size, and Nitro is already powered
on.

---

## Step 1: Turn off the expensive stuff (done)

**Why:** This is where the $85 goes. Do this first and the bleeding stops today. Nothing breaks
permanently, and you can turn it back on any time.

**First: set the region.** Everything you own lives in **US East (Ohio)**. If the console shows
N. Virginia (the default) your services will look like they don't exist. Top right of the page →
click the region name → pick **US East (Ohio)**.

1. Go to the **AWS App Runner** console → click your service → **Actions** → **Pause**.
   *Pause is the only thing that stops the charge. Making it smaller doesn't help.*
2. Go to the **EC2** console → select your instance → **Instance state** → **Stop**.
   **Do not click Terminate.** Stop is reversible; Terminate deletes it.
3. Leave **S3** alone. Your photos are in there.

While you're in the console, click **Billing → Bills** and note the real monthly total. The
numbers in this guide are estimates from the architecture, not from your account.

**You'll know it worked:** the app stops responding. That's expected; you'll bring it back on
Nitro. Your AWS bill next month should be a few dollars instead of eighty-five.

> **Pause, don't delete.** AWS stopped accepting new App Runner customers on April 30, 2026.
> Existing services keep running, but if you delete yours you probably can't create another.
> Pausing is fully reversible. Deleting is a one-way door. That's why Step 8 waits a week.

---

## Step 2: Make a key so your home server can reach the photos (done)

**Why:** On Amazon's servers the app was allowed to touch your photos automatically. Running from
home, it needs a username and password to prove it's allowed.

Your existing resources, all in Ohio: bucket `grabpic-upload-bucket`, queue
`grabpic-processing-queue`, and its dead-letter queue `grabpic-processing-dlq`.

The policies already in your account were attached to *roles* that App Runner and EC2 used. A user
can't use those, and the S3 policy you had grants no SQS access, so make one new policy covering
both.

**1. IAM → Policies → Create policy → JSON tab**, paste this, name it `grabpic-nitro-policy`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BucketLevel",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:PutBucketCORS", "s3:PutLifecycleConfiguration"],
      "Resource": "arn:aws:s3:::grabpic-upload-bucket"
    },
    {
      "Sid": "ObjectLevel",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::grabpic-upload-bucket/*"
    },
    {
      "Sid": "Queue",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage", "sqs:ReceiveMessage",
        "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"
      ],
      "Resource": [
        "arn:aws:sqs:us-east-2:975050377466:grabpic-processing-queue",
        "arn:aws:sqs:us-east-2:975050377466:grabpic-processing-dlq"
      ]
    }
  ]
}
```

**2. IAM → Users → Create user** → name `grabpic-nitro` → no console access →
**Attach policies directly** → pick `grabpic-nitro-policy`

**3.** Open the user → **Security credentials** → **Create access key** →
**Application running outside AWS**

**Copy both values now.** The secret is shown once. They go into Coolify in Step 5.

---

## Step 3: Fix two files (done)

**Why:** The Python part couldn't be packaged as-is. Two problems, neither one app logic:

- `requirements.txt` was saved as UTF-16, which pip cannot read. Now UTF-8.
- `slowapi` was missing from it despite being imported in `api.py`. Now added.

Plus a new `ai-face-worker/Dockerfile`, the recipe Coolify uses to build the Python program.
Nothing existing was rewritten.

**Verified on Nitro.** Built clean and benchmarked:

| | |
|---|---|
| Cold start (model load + first 12 MP photo) | 5.3s |
| Each photo after that | 1.0s |
| Memory per process | 1.8 GB |
| GPU used | none, Immich keeps it |

The face-recognition models are baked into the image, so there's no slow first-request download.

---

## Step 4: Give the two programs web addresses (done)

**Why:** Your website lives on Vercel and needs a way to call your home server. Cloudflare Tunnel
does this without opening any ports on your router or exposing your home IP address.

1. Edit `/etc/cloudflared/config.yml` on Nitro so anything at `*.shahirahmed.com` goes to Coolify:

```yaml
ingress:
  - hostname: test.shahirahmed.com
    service: http://localhost:3001
  - hostname: "*.shahirahmed.com"
    service: http://localhost:80
  - service: http_status:404
```

2. Apply it:

```bash
sudo cloudflared tunnel ingress validate
sudo systemctl restart cloudflared
```

3. In the **Cloudflare dashboard** → DNS, add two CNAME records, both **proxied** (orange cloud on),
   pointing at `e7ccba18-5d3a-4417-9045-ff41b4906292.cfargotunnel.com`:
   - `grabpic-api`
   - `grabpic-ai`

> **Keep subdomains one level deep.** Cloudflare's free SSL covers `shahirahmed.com` and
> `*.shahirahmed.com` only. A name like `api.grabpic.shahirahmed.com` sits two levels down, gets no
> certificate, and would need Advanced Certificate Manager at $10/month to fix.

Back up first, and validate before restarting:
`sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.bak`
To undo: copy the `.bak` back and restart cloudflared.

**You'll know it worked:** `test.shahirahmed.com` still loads.

---

## Step 5: Deploy the three programs in Coolify (done)

**Why:** This is the actual move.

Push your changes first, since Coolify builds from GitHub and can't see local files:

```bash
git add ai-face-worker/requirements.txt ai-face-worker/Dockerfile MIGRATION.md
git commit -m "Add Dockerfile for AI services, fix requirements.txt encoding"
git push
```

For each app: Coolify → **New Resource** → **Application** → **Public Repository** →
`https://github.com/Shahir-47/grab-pic` → Build Pack **Dockerfile**.

| Setting | `grabpic-api` | `grabpic-worker` | `grabpic-ai` |
|---|---|---|---|
| Base Directory | `/api` | `/ai-face-worker` | `/ai-face-worker` |
| Dockerfile Location | `/api/Dockerfile` | `/ai-face-worker/Dockerfile` | `/ai-face-worker/Dockerfile` |
| Port | `8080` | n/a | `5000` |
| Domain | `http://grabpic-api.shahirahmed.com` | none | `http://grabpic-ai.shahirahmed.com` |
| Start Command | default | default | `uvicorn api:app --host 0.0.0.0 --port 5000` |

`grabpic-worker` is a background job with no web address. Leave its health check disabled
(Coolify's default), since it has no HTTP port to check.

The two Python apps build the same image twice. That's ~5 minutes each, once.

---

### AWS credentials

Containers have no instance role, so the SDK reads the standard
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment variables instead.

`application.properties` also declared `aws.s3.access-key` / `aws.s3.secret-key` from
`${AWS_ACCESS_KEY}` / `${AWS_SECRET_KEY}`, but nothing ever read them: no `@Value`, no
constructor. Those two lines have since been deleted, so only the two standard names are needed.

---

### Environment variables

**`grabpic-api`**

```
PORT=8080
DDL_AUTO=validate

DB_URL=                          ← from App Runner console
DB_USERNAME=                     ← from App Runner console
DB_PASSWORD=                     ← from App Runner console

AWS_REGION=us-east-2
AWS_BUCKET_NAME=grabpic-upload-bucket
AWS_SQS_URL=https://sqs.us-east-2.amazonaws.com/975050377466/grabpic-processing-queue

AWS_ACCESS_KEY_ID=               ← Step 2 key
AWS_SECRET_ACCESS_KEY=           ← Step 2 secret

SUPABASE_VERIFY=                 ← from App Runner console
SUPABASE_JWT_ISSUER=             ← from App Runner console

REDIS_URL=                       ← your Upstash URL
REDIS_SSL=true

TURNSTILE_SECRET=                ← from App Runner console
TURNSTILE_ALLOWED_HOSTNAMES=grab-pic.vercel.app
CORS_ALLOWED_ORIGINS=https://grab-pic.vercel.app
```

Leave all `CLOUDFRONT_*` unset. The code falls back to S3 signed links on its own and logs
`CloudFront not configured`, which is correct now.

**`grabpic-worker`**

```
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=               ← Step 2 key
AWS_SECRET_ACCESS_KEY=           ← Step 2 secret
AWS_BUCKET_NAME=grabpic-upload-bucket
SQS_QUEUE_URL=https://sqs.us-east-2.amazonaws.com/975050377466/grabpic-processing-queue

DB_HOST=                         ← Supabase host
DB_NAME=postgres
DB_USER=
DB_PASSWORD=
DB_PORT=5432
```

**`grabpic-ai`**

```
PORT=5000
DB_HOST=                         ← same as worker
DB_NAME=postgres
DB_USER=
DB_PASSWORD=
DB_PORT=5432

ALLOWED_ORIGINS=https://grab-pic.vercel.app
TURNSTILE_SECRET=                ← same as the API
TURNSTILE_ALLOWED_HOSTNAMES=grab-pic.vercel.app
```

Note `grabpic-ai` uses `ALLOWED_ORIGINS`, while `grabpic-api` uses `CORS_ALLOWED_ORIGINS`.
Different names, same idea.

**Type the domains as `http://`, not `https://`.** Cloudflare adds the padlock. Typing `https://`
makes Coolify chase its own certificate, which fails through a tunnel.

**You'll know it worked:** all three green in Coolify, and `https://grabpic-api.shahirahmed.com`
answers instead of returning 404.

---

## Step 6: Point the website at the new server (done)

**Why:** Vercel is still calling the old Amazon addresses.

Vercel dashboard → your project → **Settings** → **Environment Variables**. Change these two:

```
NEXT_PUBLIC_API_URL     = https://grabpic-api.shahirahmed.com
NEXT_PUBLIC_AI_API_URL  = https://grabpic-ai.shahirahmed.com
```

`https://` here, because that's the public address. No `/api` on the end, no slash on the end.

Then **Redeploy**.

---

## Step 7: Check it actually works (done)

Walk through the app like a normal user:

- [ ] Log in
- [ ] Create an album and upload a photo
- [ ] In Coolify, open the `grabpic-worker` logs. You should see `Found N faces` then
      `Saved to Database`
- [ ] The photo shows as processed
- [ ] Open the guest link, upload a selfie, get matches back
- [ ] Download the ZIP

**One last thing:** open Uptime Kuma (already running on Nitro) and add a check on your site every
5 minutes. It tells you if the site goes down, *and* it stops Supabase from putting your free
database to sleep, which happens after 7 days of no visitors and would silently break the app
right when a recruiter clicks your link.

---

## Notes from the actual migration

Things that came up that the plan didn't predict:

- **Coolify SSH permissions.** First deploy failed with "SSH keys storage directory is not writable."
  `/data/coolify/ssh` was owned by UID 1000; Coolify runs as 9999. Fixed once with
  `sudo chown -R 9999:9999 /data/coolify/ssh && sudo chmod -R 700 /data/coolify/ssh && docker restart coolify`.
- **Supabase had auto-paused** after months idle, and the pooler returned
  `FATAL: (ENOTFOUND) tenant/user ... not found`. Restoring it from the dashboard fixed it.
  This is exactly what the uptime-kuma check below prevents.
- **Upstash Redis was gone entirely** (no DNS record). Free databases get reclaimed after long
  inactivity. Replaced with a Redis container on Nitro, which is better anyway: no expiry, no
  token to rotate, `REDIS_URL=redis://...` and `REDIS_SSL=false`.
- **Coolify has no Start Command field for Dockerfile builds.** The worker and search API share one
  image, so the Dockerfile's CMD became `exec ${START_CMD:-python main.py}`. The search API sets
  `START_CMD`, the worker leaves it unset.
- **Cloudflare's free SSL only covers one subdomain level.** `api.grabpic.shahirahmed.com` would
  have had no certificate; `grabpic-api.shahirahmed.com` works.
- **Coolify auto-assigns an sslip.io domain and port 3000** to every new app. Both need replacing.
- **Supabase Realtime silently delivered nothing.** The dashboard's "Scanning..." badge never
  cleared without a manual reload. The `photos` table *was* in the `supabase_realtime` publication
  and *did* have a `SELECT` policy for `authenticated`, but its replica identity was `d` (primary
  key only). The subscription filters on `album_id` and the RLS policy resolves
  `album_id IN (select ... from shared_albums ...)`. Neither is available from just the key, so
  Realtime discarded every event at the RLS check. Fix, applied directly to the database:

  ```sql
  alter table public.photos replica identity full;
  ```

  **This lives only in the database, not in any migration file.** If the project is ever rebuilt
  from scratch, re-apply it or live updates break again with no error message anywhere.
  Pre-existing, and unrelated to the migration.

---

## Step 8: Delete the old AWS stuff (wait a week first)

Once it's been working for a week, delete **only the two computers.** Keep S3 and SQS, since the
app still uses them.

- Delete the App Runner service
- **Terminate** the EC2 instance and delete its disk
- Release the Elastic IP, if you have one
- Delete the ECR repository (old container images)
- Set a **billing alarm at $1** so nothing surprises you later

---

## If something goes wrong

Nothing on AWS is deleted until Step 8, so you can always go back:

1. Un-pause App Runner
2. Start the EC2 instance
3. Put the old addresses back in Vercel

Takes about five minutes.

---

## Later, if you feel like it

That last ~$1/month is Amazon storing your photos. You could move those to your own Nitro box too,
but unlike everything above it *does* require changing code in two places. Only worth it if the
project ever gets real traffic. Not now.
