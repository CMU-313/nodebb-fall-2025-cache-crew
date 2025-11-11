# User Guide – Endorse Post Feature

## Overview
The **Endorse Post** feature allows course staff (Professors, TAs, and Admins) to mark specific posts as "Endorsed".  
Endorsed posts receive a visible badge and a highlight, making it easier for students to identify authoritative answers.

This feature was added through the `nodebb-plugin-endorse-posts` plugin and integrates directly into the NodeBB forum interface.

---

## How to Use

### 1. Enabling the Plugin
1. Log into NodeBB as an administrator.
2. Go to **Admin Control Panel → Plugins → Installed**.
3. Find **Endorse Posts** in the list.
4. Enable the plugin.
5. Rebuild and restart NodeBB.

---

### 2. Endorsing a Post
- Log in as **Professor, TA, Admin, or Global Moderator**.
- Navigate to any topic post.
- Open the **post tools dropdown (⋮)**.
- Click **“Endorse”**.
- The post will now show:
  - An **Endorsed badge** in the header.
  - A **highlighted left border**.

---

### 3. Removing Endorsement
- Open the same post tools dropdown.
- Select **“Un-endorse”**.
- The badge and highlight will disappear.

---

### 4. Viewing as a Student
- Students cannot endorse or un-endorse posts.
- They will only see the **badge and highlight** on endorsed posts.

---

## API Endpoints (for advanced testing)
Two REST API routes are exposed for automation or integration:
- `POST /api/v3/posts/:pid/endorse` → Marks a post as endorsed.
- `DELETE /api/v3/posts/:pid/endorse` → Removes endorsement.

Responses return:
```json
{ "isEndorsed": true }   // or false
