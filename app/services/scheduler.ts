import { AsyncTask, CronJob, ToadScheduler } from "toad-scheduler";
import { refreshAnimeData } from "./animeData";
import { refreshSchedule } from "./scheduleService";
import { cleanupEndedSubscriptions } from "./subscriptionCleanupService";

const scheduler = new ToadScheduler();
let isSchedulerStarted = false;

function createTask(name: string, action: () => Promise<unknown>): AsyncTask {
    return new AsyncTask(
        name,
        async () => {
            console.log(`[Scheduler] Starting ${name} at ${new Date().toISOString()}`);
            try {
                await action();
                console.log(`[Scheduler] Completed ${name}`);
            } catch (error) {
                console.error(`[Scheduler] Failed ${name}:`, error);
            }
        },
        err => console.error(`[Scheduler] Error in ${name}:`, err),
    );
}

export function startScheduler() {
    if (isSchedulerStarted) {
        console.log("[Scheduler] Already running");
        return;
    }

    const jobs: { cron: string; task: AsyncTask }[] = [
        {
            cron: "0 0 * * *",
            task: createTask("refresh-anime", async () => {
                const result = await refreshAnimeData();
                if (!result.success) {
                    throw new Error("Failed to refresh anime data");
                }
                console.log(`[Scheduler] Refreshed ${result.count} anime entries`);
            }),
        },
        {
            cron: "0 */6 * * *",
            task: createTask("refresh-schedule", refreshSchedule),
        },
        {
            cron: "0 1 * * *",
            task: createTask("cleanup-ended-subscriptions", cleanupEndedSubscriptions),
        },
    ];

    for (const { cron, task } of jobs) {
        scheduler.addCronJob(new CronJob({ cronExpression: cron }, task, { preventOverrun: true }));
    }

    isSchedulerStarted = true;
    console.log("[Scheduler] Started");
}

export function stopScheduler() {
    scheduler.stop();
    isSchedulerStarted = false;
    console.log("[Scheduler] Stopped");
}
