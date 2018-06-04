/* @flow */
import type { IMetricsClient } from "../../server/lib/shared";


class MetricsClientMock implements IMetricsClient {
  increment(name: string, value: number = 1) {
    console.log(`Metric ${name} incremented by ${value}`);
  }

  value(name: string, value: number = 1) {
    console.log(`Metric ${name} value set to ${value}`);
  }
}

module.exports = { MetricsClientMock };
