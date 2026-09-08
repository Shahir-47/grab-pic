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
storing the actual photo files, which is cheap. Everything else — the website on Vercel, the login
and database on Supabase — is already free and doesn't get touched.

---

## What it costs at each stage

| | Per month |
|---|---|
| Now | ~$85 |
| After Step 1 (10 minutes from now) | **~$3–7** |
| After Step 8 (old servers deleted) | **~$1** |

The final ~$1 is Amazon storing your photos, about 2¢ per GB. The $3–7 in between is the stopped
EC2's disk plus an Elastic IP if you have one; both go away at Step 8. Everything else — SQS,
Vercel, Supabase, Upstash, Turnstile, Cloudflare Tunnel — is free at your size, and Nitro is
already powered on.

---

## Step 1 — Turn off the expensive stuff (10 minutes)

**Why:** This is where the $85 goes. Do this first and the bleeding stops today. Nothing breaks
permanently — you can turn it back on any time.

**First: set the region.** Everything you own lives in **US East (Ohio)**. If the console shows
N. Virginia (the default) your services will look like they don't exist. Top right of the page →
click the region name → pick **US East (Ohio)**.

1. Go to the **AWS App Runner** console → click your service → **Actions** → **Pause**.
   *Pause is the only thing that stops the charge. Making it smaller doesn't help.*
2. Go to the **EC2** console → select your instance → **Instance state** → **Stop**.
   **Do not click Terminate.** Stop is reversible; Terminate deletes it.
3. Leave **S3** alone. Your photos are in there.

While you're in the console, click **Billing → Bills** and note the real monthly total — the
numbers in this guide are estimates from the architecture, not from your account.

**You'll know it worked:** the app stops responding. That's expected — you'll bring it back on
Nitro. Your AWS bill next month should be a few dollars instead of eighty-five.

> **Pause, don't delete.** AWS stopped accepting new App Runner customers on April 30, 2026.
> Existing services keep running, but if you delete yours you probably can't create another.
> Pausing is fully reversible — deleting is a one-way door. That's why Step 8 waits a week.

---

## Step 2 — Make a key so your home server can reach the photos (10 minutes)

**Why:** On Amazon's servers the app was allowed to touch your photos automatically. Running from
home, it needs a username and password to prove it's allowed.

Your existing resources, all in Ohio: bucket `grabpic-upload-bucket`, queue
`grabpic-processing-queue`, and its dead-letter queue `grabpic-processing-dlq`.

The policies already in your account were attached to *roles* that App Runner and EC2 used. A user
can't use those, and the S3 policy you had grants no SQS access — so make one new policy covering
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

**Copy both values now** — the secret is shown once. They go into Coolify in Step 5.

---

## Step 3 — Fix two files ✅ DONE

**Why:** The Python part couldn't be packaged as-is. Two problems, neither one app logic:

- `requirements.txt` was saved as UTF-16, which pip cannot read — now UTF-8
- `slowapi` was missing from it despite being imported in `api.py` — now added

Plus a new `ai-face-worker/Dockerfile`, the recipe Coolify uses to build the Python program.
Nothing existing was rewritten.

**Verified on Nitro** — built clean and benchmarked:

| | |
|---|---|
| Cold start (model load + first 12 MP photo) | 5.3s |
| Each photo after that | 1.0s |
| Memory per process | 1.8 GB |
| GPU used | none — Immich keeps it |

The face-recognition models are baked into the image, so there's no slow first-request download.

---

## Step 4 — Give the two programs web addresses (15 minutes)

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

## Step 5 — Deploy the three programs in Coolify (30 minutes)

**Why:** This is the actual move. Three programs, all built from your existing GitHub repo.

For each one: Coolify → **New Resource** → **Application** → point it at your repo → pick the
folder → set the environment variables → **Deploy**.

| Name | Folder in repo | Web address | Start command |
|---|---|---|---|
| `grabpic-api` | `api` | `http://grabpic-api.shahirahmed.com` | leave default |
| `grabpic-worker` | `ai-face-worker` | none — it's a background job | `python main.py` |
| `grabpic-ai` | `ai-face-worker` | `http://grabpic-ai.shahirahmed.com` | `uvicorn api:app --host 0.0.0.0 --port 5000` |

**Environment variables:** copy the ones you already have (they're listed in the
[README](README.md#environment-variables)), and add the two keys from Step 2:

```
AWS_ACCESS_KEY_ID      = (from step 2)
AWS_SECRET_ACCESS_KEY  = (from step 2)
```

Three things that trip people up:

- Type the web address as **`http://`**, not `https://`. Cloudflare adds the padlock for you.
  Typing `https://` makes Coolify try to get its own certificate, which fails through a tunnel.
- The worker takes about **5 seconds** to load its models before it starts polling. Quick.
- The names in the old README, `AWS_ACCESS_KEY` and `AWS_SECRET_KEY`, are dead — the code ignores
  them. Use the longer names above.

**You'll know it worked:** all three show green in Coolify, and
`https://grabpic-api.shahirahmed.com` responds instead of timing out.

---

## Step 6 — Point the website at the new server (5 minutes)

**Why:** Vercel is still calling the old Amazon addresses.

Vercel dashboard → your project → **Settings** → **Environment Variables**. Change these two:

```
NEXT_PUBLIC_API_URL     = https://grabpic-api.shahirahmed.com
NEXT_PUBLIC_AI_API_URL  = https://grabpic-ai.shahirahmed.com
```

`https://` here — that's the public address. No `/api` on the end, no slash on the end.

Then **Redeploy**.

---

## Step 7 — Check it actually works

Walk through the app like a normal user:

- [ ] Log in
- [ ] Create an album and upload a photo
- [ ] In Coolify, open the `grabpic-worker` logs — you should see `Found N faces` then
      `Saved to Database`
- [ ] The photo shows as processed
- [ ] Open the guest link, upload a selfie, get matches back
- [ ] Download the ZIP

**One last thing:** open Uptime Kuma (already running on Nitro) and add a check on your site every
5 minutes. It tells you if the site goes down, *and* it stops Supabase from putting your free
database to sleep — that happens after 7 days of no visitors, which would silently break the app
right when a recruiter clicks your link.

---

## Step 8 — Delete the old AWS stuff (wait a week first)

Once it's been working for a week, delete **only the two computers.** Keep S3 and SQS — the app
still uses them.

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
