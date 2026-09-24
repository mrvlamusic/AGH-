import { Controller, Get, Post } from "@nestjs/common";
import { demoOrders, getMarketSummary, matchOrders } from "@cubpay/core";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return { ok: true, service: "cubpay-api", simulationMode: true };
  }
}

@Controller("market")
export class MarketController {
  @Get("summary")
  getSummary() {
    return getMarketSummary(demoOrders);
  }

  @Get("orders")
  getOrders() {
    return demoOrders.map(({ organizationId, ...publicOrder }) => publicOrder);
  }
}

@Controller("simulation")
export class SimulationController {
  @Post("match")
  runMatch() {
    return {
      simulation: true,
      allocations: matchOrders(demoOrders),
    };
  }
}
