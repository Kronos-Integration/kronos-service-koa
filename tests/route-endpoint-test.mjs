import test from "ava";
import got from "got";

import { SendEndpoint } from "@kronos-integration/endpoint";
import { StandaloneServiceProvider } from "@kronos-integration/service";
import { ServiceKOA } from "../src/service-koa.mjs";
import {
  RouteSendEndpoint,
  endpointRouter
} from "../src/route-send-endpoint.mjs";
import { BodyParserInterceptor } from "../src/body-parser-interceptor.mjs";

test("endpoint route basics", async t => {
  const sp = new StandaloneServiceProvider();
  const ks = new ServiceKOA(
    {
      listen: {
        socket: 1240
      }
    },
    sp
  );

  const r1 = ks.addEndpoint(new RouteSendEndpoint("/r1", ks));
  const s1 = new SendEndpoint("s1");
  s1.receive = async () => "OK S1";
  r1.connected = s1;

  const r2 = ks.addEndpoint(
    new RouteSendEndpoint("/r2", ks, {
      method: "POST",
      interceptors: [new BodyParserInterceptor()]
    })
  );
  //t.truthy(r2.hasInterceptors);
  console.log(`r2: ${r2}`);
  
  const s2 = new SendEndpoint("s2");
  s2.receive = async () => "OK S2";
  r2.connected = s2;

  console.log(`r2: ${r2}`);

  ks.koa.use(endpointRouter(ks));

  await ks.start();

  let response = await got("http://localhost:1240/r1");
  t.is(response.body, "OK S1");
  t.is(response.statusCode, 200);

  response = await got("http://localhost:1240/r2", {
    body: JSON.stringify({ prop1: "value1", prop2: 2 }),
    method: "POST"
  });
  t.is(response.body, "OK S2");
  t.is(response.statusCode, 200);

  //response = await got("http://localhost:1240/r0");

  await ks.stop();
});

test("endpoint factory", async t => {
  const sp = new StandaloneServiceProvider();

  const s1 = new SendEndpoint("s1");
  s1.receive = async () => "OK S1";

  const http = await sp.declareService(
    {
      name: "http",
      type: ServiceKOA,
      listen: {
        socket: 1241
      },
      endpoints: {
        "/r1": { connected: s1 },
        "/r2": { method: "post" },
        "/r3": { path: "/somwhere" }
      }
    },
    true
  );

  t.is(http.endpoints["/r1"].name, "/r1");
  t.is(http.endpoints["/r1"].path, "/r1");
  t.is(http.endpoints["/r1"].method, "GET");
  t.true(http.endpoints["/r1"] instanceof RouteSendEndpoint);

  t.is(http.endpoints["/r2"].method, "POST");
  t.is(http.endpoints["/r3"].path, "/somwhere");

  http.koa.use(endpointRouter(http));

  await http.start();

  let response = await got("http://localhost:1241/r1");
  t.is(response.body, "OK S1");
  t.is(response.statusCode, 200);
});