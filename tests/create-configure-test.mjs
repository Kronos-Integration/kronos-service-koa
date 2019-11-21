import test from "ava";
import address from "network-address";
import route from "koa-route";
import got from "got";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

import { StandaloneServiceProvider } from "@kronos-integration/service";
import { ServiceKOA } from "../src/service-koa.mjs";

const here = dirname(fileURLToPath(import.meta.url));

async function skt(t, config, ...args) {
  let expected = args.pop() || {};
  const updates = args.pop() || [];

  expected = { timeout: { server: 120 }, ...expected };
  const sp = new StandaloneServiceProvider();
  const ks = new ServiceKOA(config, sp);

  for (const u of updates) {
    await ks.configure(u);
  }

  ["name", "isSecure", "socket", "url", "address"].forEach(a => {
    if (expected[a] !== undefined) {
      t.is(ks[a], expected[a], a);
    }
  });

  for (const name of Object.keys(expected.timeout)) {
    t.is(ks.timeout[name], expected.timeout[name], `timeout ${name}`);
  }

  ks.koa.use(route.get("/", ctx => (ctx.body = "OK")));

  t.is(ks.state, "stopped");
  await ks.start();
  t.is(ks.state, "running");

  const response = await got(ks.url, { ca: config.cert });
  t.is(response.body, "OK");
  t.is(response.statusCode, 200);

  await ks.stop();
  t.is(ks.state, "stopped");
}

skt.title = (providedTitle = "", config, updates) => {
  const c = { ...config };
  delete c.key;
  delete c.cert;

  return `koa ${providedTitle} ${JSON.stringify(c)}${
    Array.isArray(updates) ? " with " + JSON.stringify(updates) : ""
  }`.trim();
};

test(
  skt,
  {
    name: "my-name",
    listen: {
      socket: 1234,
      address: address()
    }
  },
  {
    name: "my-name",
    adrress: address(),
    socket: 1234,
    url: `http://${address()}:1234`,
    isSecure: false
  }
);

test(
  skt,
  {
    listen: {
      url: `http://${address()}:1234`
    }
  },
  {
    adrress: address(),
    socket: 1234,
    url: `http://${address()}:1234`,
    isSecure: false
  }
);

test(
  skt,
  {
    listen: {
      url: `http://${address()}:1234`
    }
  },
  [
    {
      listen: {
        socket: 1235
      }
    },
    {
      timeout: {
        server: 123.45
      }
    }
  ],
  {
    adrress: address(),
    socket: 1235,
    url: `http://${address()}:1235`,
    isSecure: false,
    timeout: {
      server: 123.45
    }
  }
);

test(
  skt,
  {
    key: readFileSync(
      join(here, "..", "tests", "fixtures", "www.example.com.key")
    ),
    cert: readFileSync(
      join(here, "..", "tests", "fixtures", "www.example.com.cert")
    ),
    listen: {
      address: "localhost",
      socket: 1236
    }
  },
  {
    isSecure: true,
    url: `https://localhost:1236`
  }
);