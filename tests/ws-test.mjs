import test from "ava";
import WebSocket from "ws";
import { SendEndpoint } from "@kronos-integration/endpoint";
import { StandaloneServiceProvider } from "@kronos-integration/service";
import { ServiceKOA } from "../src/service-koa.mjs";
import { WSEndpoint } from "../src/ws-endpoint.mjs";

async function wait(msecs = 1000) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), msecs);
  });
}

test("ws send", async t => {
  const sp = new StandaloneServiceProvider();

  let severOppositeOpened = 0;

  const s1 = new SendEndpoint("s1", {
    opposite: {
      opened: () => {
        console.log("opposite opened");
      }
    },

    opened: endpoint => {
      console.log("s1 opened");
      severOppositeOpened++;
      const o = endpoint.opposite;
      endpoint.receive(o.receive());

      const interval = setInterval(() => endpoint.receive(o.receive()), 500);

      return () => clearInterval(interval);
    },
    receive: message => `${message} OK S1`
  });

  const http = await sp.declareService({
    name: "http",
    type: ServiceKOA,
    listen: {
      socket: 1236
    },
    endpoints: {
      "/r1": { connected: s1, ws: true }
    }
  });
  t.is(http.endpoints["/r1"].name, "/r1");
  t.is(http.endpoints["/r1"].path, "/r1");
  t.is(http.endpoints["/r1"].ws, true);
  t.true(http.endpoints["/r1"] instanceof WSEndpoint);

  /*
  http.endpoints["/r1"].connected = undefined;
  http.endpoints["/r1"].connected = s1;
  */

  s1.receive = message => `${message} OK S1`;
  await http.start();

  const socketUrl = "ws://localhost:1236/r1";
  const ws = new WebSocket(socketUrl, {});

  let disconnected = 0;
  let opened = 0;

  ws.on("open", () => {
    opened++;

    ws.send("form client", {
      mask: true
    });
  });

  const messages = [];

  ws.on("message", message => {
    messages.push(message);
    console.log("from server:", message);
  });

  ws.on("close", () => {
    disconnected++;
  });

  await wait(2000);

  console.log(messages);
  t.is(opened, 1);
  t.is(messages[0], "form client OK S1");
  // t.is(severOppositeOpened, 1);
  //t.is(disconnected, 1);
});
