import { productionIndicatorsRepository as repository } from "./production-indicators.repository.js";
import { toProductionIndicatorsResponse } from "./production-indicators.mapper.js";
import { previousPeriod, toDateRange } from "./production-indicators.period.js";
import { productionIndicatorsQuerySchema } from "./production-indicators.schema.js";

export const productionIndicatorsServices = {
  /**
   * Indicadores da produção do pescador logado num mês ou num ano: captura por espécie, lugar e
   * método, ganhos e vendas. Só pescas terminadas entram, contadas pela data da pesca.
   */
  async getIndicators(userId: number, query: unknown) {
    const period = productionIndicatorsQuerySchema.parse(query);
    const previous = previousPeriod(period);
    const range = toDateRange(period);

    const [counts, species, locations, methods, earnings, previousEarnings, buyerTypes] =
      await Promise.all([
        repository.countRecords(userId, range),
        repository.sumCatchesBySpecies(userId, range),
        repository.sumCatchesByLocation(userId, range),
        repository.sumCatchesByMethod(userId, range),
        repository.sumEarningsByMonth(userId, range),
        repository.sumEarningsByMonth(userId, toDateRange(previous)),
        repository.countSalesByBuyerType(userId, range),
      ]);

    return toProductionIndicatorsResponse({
      period,
      previous,
      counts,
      species,
      locations,
      methods,
      earnings,
      previousEarnings,
      buyerTypes,
    });
  },
};
