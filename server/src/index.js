import { config } from "./config.js";
import { createApp } from "./app.js";

const server = createApp().listen(config.port, () => console.log(`WitHub API ouvindo na porta ${config.port}`));
const stop = () => server.close(() => process.exit(0));
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
