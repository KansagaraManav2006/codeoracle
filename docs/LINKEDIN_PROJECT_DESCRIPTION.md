# CodeOracle - LinkedIn Project Description

I'm excited to share CodeOracle, an automated code analysis platform I recently built and deployed! 🚀

**The Problem:**
Diving into an unfamiliar or legacy codebase is time-consuming. Developers often spend hours just reading code to untangle dependencies, map out architecture, and figure out safe refactoring paths.

**The Solution:**
CodeOracle automates this initial discovery. You simply upload a ZIP or paste a public GitHub URL, and the system parses the Abstract Syntax Tree (AST) to extract a complete structural map of the project. It provides interactive visualizations, dependency graphs, and complexity metrics instantly.

**Tech Stack:**
React 18, TypeScript, Vite, React Three Fiber, Python 3.12, FastAPI, PostgreSQL, SQLAlchemy, Docker, and Render.

**Major Engineering Challenges:**
- **Asynchronous Processing:** Deeply parsing an AST is computationally heavy. I built a robust job-polling state machine to offload processing to the background, keeping the UI fast and responsive.
- **Production Asset Caching:** I encountered a fascinating issue where Vite's dynamic imports (for 3D charts) failed post-deployment. The fix involved strict FastAPI header configuration to prevent stale `index.html` caching while permanently caching immutable JS/CSS chunks.
- **Database Engineering:** Enforcing strict row-level ownership in PostgreSQL to safely separate anonymous demo traffic from authenticated users' private projects.

Check it out live: https://codeoracle-l7ay.onrender.com
View the source: https://github.com/KansagaraManav2006/codeoracle
