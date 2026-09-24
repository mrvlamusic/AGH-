import { Module } from "@nestjs/common";
import { HealthController, MarketController, SimulationController } from "./controllers";

@Module({
  controllers: [HealthController, MarketController, SimulationController],
})
export class AppModule {}
