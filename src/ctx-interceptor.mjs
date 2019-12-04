import { Interceptor } from "@kronos-integration/interceptor";

/**
 * extracts params form request body
 */
export class CTXInterceptor extends Interceptor {
  /**
   * @return {string} 'ctx-body-param'
   */
  static get name() {
    return "ctx";
  }

  async receive(endpoint, next, ctx, params) {
    ctx.body = await next(params);
  }
}
