import "dotenv/config";
import { startProxyServer } from "./proxy/proxyServer";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
startProxyServer(PORT);
