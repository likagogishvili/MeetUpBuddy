# 📅 MeetUpBuddy

**MeetUpBuddy** is a friendly scheduling tool built with **Next.js** and **NestJS**. It helps you share your availability and lets friends, coworkers, or collaborators book time with you — no more endless "When are you free?" messages!

---

## ✨ Key Features

- 🗓 **Add your own events** to mark availability  
- ✅ **Share free slots** with others  
- 🤝 **Let people request time** to meet you  
- 🔒 **Private and personal** — you control what others see  

---

## 🧰 Tech Stack

- **Frontend:** Next.js + TypeScript + Tailwind CSS + ShadCN UI  
- **Backend API:** NestJS (Node.js) - `MeetUpBuddy_API`  
- **API:** RESTful architecture (Swagger available)  
- *(Add DB, Redis, Auth, etc. if applicable)*

---

## 🔗 Backend API

- Repo: `MeetUpBuddy_API` — [github.com/likagogishvili/MeetUpBuddy_API](https://github.com/likagogishvili/MeetUpBuddy_API)
- Base URL (local): `http://localhost:4001`
- Docs: `http://localhost:4001/api`

Environment:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:4001
```

Quick start (see API repo for full instructions):

1) Start Redis (Docker or local)  
2) Run API services from `MeetUpBuddy_API`  
3) Start this frontend:

```bash
npm install
npm run dev
```

Main endpoints used by the frontend:

- Auth: `POST /auth/signin`
- Customer: `POST /customer`, `GET /customer/:id`, `GET /customer/:id/notes`
- Notes: `POST /note`, `GET /note`, `DELETE /note/:id`
- Friendship:
  - `POST /friendship/search/:userId` — search by email
  - `POST /friendship/request/:userId` — send request by email
  - `GET /friendship/requests/:userId/{received|sent}`
  - `POST /friendship/respond/:userId`
  - `GET /friendship/friends/:userId`

---

## 🚀 Use Cases

- Catch up with friends  
- Quick coffee or lunch plans  
- Friendly syncs or mentoring time  
- "Open office hours" for your community  

---

## 📌 Coming Soon

- Calendar sync (Google/Outlook)  
- Notifications & reminders  
- Booking approval system  
- Profile sharing

---

## 💡 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue.

---

## 📄 License

MIT License
