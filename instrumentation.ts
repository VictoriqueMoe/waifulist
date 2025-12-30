export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { startScheduler } = await import("./app/services/scheduler");
        const { ensureFuseIndex } = await import("./app/services/animeData");
        const { closeRedis } = await import("./app/lib/redis");

        startScheduler();
        ensureFuseIndex();

        process.on("SIGTERM", async () => {
            await closeRedis();
            process.exit(0);
        });
    }
}
