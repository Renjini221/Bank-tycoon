# Banking Tycoon

Run a bank in Kochi for a 360-day year. Start with ₹1,00,000 in founding capital, ₹50,000 in customer deposits and three borrowers at the loan desk. Keep enough cash to meet withdrawals while earning interest on your loan portfolio. Finish the year with ₹2,00,000 in equity to reach the stretch goal.

## Start on Windows

Use PowerShell with Node.js 22.12 or newer installed. This project was verified on Node 22.17.

```powershell
Set-Location 'D:\Desktop\CODING\Anythings'
npm.cmd ci
npm.cmd run dev
```

Open [the local game](http://127.0.0.1:5173/). On subsequent launches, only the directory change and `npm.cmd run dev` are needed. Press Ctrl+C in the server terminal to stop it.

## Play and save

- Click a borrower to inspect the repayment terms, risk and cash remaining after approval. Early loan payments fall ten days after issue.
- Open **Investment Desk** to buy a 7-day treasury bill, 30-day municipal note or 60-day infrastructure bond. Enter a whole-rupee amount of at least ₹1,000 and review the interest, payout date and cash remaining. On maturity, the bank receives principal and interest before withdrawals settle. Monthly profit includes the interest earned.
- The outlook estimates tomorrow’s total withdrawals, including the scheduled amount. Borrower repayments shown there can arrive late. Check the bulletin before committing cash around Onam.
- Open **Deposits Desk** to accept savings, current, fixed, and recurring deposits, review maturities, and set interest rates. Staff hiring, firing, and training are under **Management**. The savings slider previews daily interest and average new savers. For example, 4% attracts two new savers per game day, and 8% attracts four. Settling the day opens their accounts and records their deposits in the ledger.
- Higher fixed and recurring rates shorten the wait between customer offers. Each accepted contract keeps its opening rate until maturity. Current accounts pay zero interest.
- Use Pause, 1×, 5× or 15×, or settle one day with **Next day**. Each month contains 30 days. Closing a monthly statement leaves the game paused.
- Guest progress saves in this browser after decisions and daily settlement. Leaving the tab pauses the clock. Reopening the same address restores the elapsed fraction of the day.
- **Leaderboard** ranks banks that survive all 360 days by closing cash plus outstanding loan principal minus all customer deposits owed. The final settlement processes repayments, write-offs, investment maturities and withdrawals before scoring. Gain or loss is the score less ₹1,00,000 starting capital. **My runs** keeps completed years on this device when you start a new bank. **Shared banks** shows the top 25 players and your own rank. After syncing a completed year, choose **Post score** to publish your bank name and closing equity. Each player keeps their highest score. Ties share a rank at every clock speed.
- On first visit, create a username and password, then log in. Choose **Continue as guest** for local play. The account panel and footer show save status. **New run** asks before replacing the current bank.

## Connect Supabase

1. Create a Supabase project. In its SQL Editor, execute [the migration](supabase/migrations/001_bank_saves.sql) once. It creates one save per authenticated user and applies row-level security to reads, inserts and updates.
   Then apply [002_leaderboard.sql](supabase/migrations/002_leaderboard.sql) to enable shared rankings. The score function calculates equity from the signed-in player's synced final balances. Readers receive ranks, bank names, equity in paise, and an indicator for their own entry. This is a casual leaderboard based on client-simulated games.
2. Use a dedicated game project, enable the Email provider and sign-ups under **Authentication**, and turn off **Confirm email**. Supabase password auth uses an internal email-shaped identifier for each case-insensitive username. These identifiers have no mailbox or email password recovery. Existing email-link players can still use their original email address through **Log in → Use an existing email-link account**. Allow the game origin in **URL Configuration** for that flow.
3. Copy the template in PowerShell.

   ```powershell
   Copy-Item .env.example .env.local
   notepad .env.local
   ```

4. In the project’s Connect dialog, copy the Project URL and **publishable** key into `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Vite includes these values in browser code. Keep server secrets out of these variables.
5. Restart Vite. Choose **Create account** and then **Log in** with the same username and password. On a second device, use the same Supabase configuration and account. If the saves differ, select **Keep cloud save** to resume the existing bank or **Keep device save** to upload the local run.

Cloud requests occur at save points. A revision check detects conflicting updates from other devices. Failed writes preserve local progress, and the account panel offers **Retry sync**.

See the [Supabase React authentication guide](https://supabase.com/docs/guides/auth/quickstarts/react) and [row-level security documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Verify the project

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

The production build is in `dist`. The preview command prints its local URL. The test suite exercises the balance sheet, integer-paise interest, missed payments and defaults, liquidity failures, pause and speed changes, timer races, save restoration, monthly reporting, a full-year run, and cloud conflict and failure handling using an in-memory repository. Live email delivery and database policies require a configured Supabase project.

## Adjust the simulation

| Setting | Location |
| --- | --- |
| Real time per game day and available speeds | `DAY_MS` and `SPEEDS` in [config.ts](src/game/config.ts) |
| Founding capital and stretch goal | `STARTING_CAPITAL` and `EQUITY_TARGET` in [config.ts](src/game/config.ts). Amounts use paise, so ₹1 equals 100 units. |
| Operating expenses, withdrawal pressure and missed-payment risk | `DIFFICULTY` in [config.ts](src/game/config.ts) |
| Opening deposits, borrower terms, deposit growth and festival dates | [model.ts](src/game/model.ts) |

Capital changes apply to new runs. All annual interest rates use the 360-day calendar. The ledger distinguishes principal, income and expenses, and the opening chart plots actual founding capital and deposit transactions until daily closing balances are available.
