const INDUSTRY_INDICATORS = {
  'food': {
    'worldBank': [
      'AG.LND.AGRI.ZS',    // Agricultural land (% of land area)
      'AG.PRD.FOOD.XD',    // Food production index
      'AG.YLD.CREL.KG',    // Cereal yield (kg per hectare)
      'AG.CON.FERT.ZS',    // Fertilizer consumption
      'NV.AGR.TOTL.ZS',    // Agriculture value added (% of GDP)
      'SL.AGR.EMPL.ZS',    // Employment in agriculture
      'TM.VAL.FOOD.ZS.UN'  // Food imports (% of merchandise imports)
    ]
  },
  
  'ict': {
    'worldBank': [
      'IT.NET.USER.ZS',      // Internet users (% of population)
      'IT.CEL.SETS.P2',      // Mobile cellular subscriptions
      'IT.NET.BBND.P2',      // Fixed broadband subscriptions
      'TX.VAL.ICTG.ZS.UN',   // ICT goods exports
      'TM.VAL.ICTG.ZS.UN',   // ICT goods imports
      'IT.NET.SECR.P6'       // Secure Internet servers
    ]
  },
  
  'infrastructure': {
    'worldBank': [
      'IS.ROD.DNST.K2',      // Road density
      'IS.ROD.PAVE.ZS',      // Roads, paved (%)
      'IS.RRS.TOTL.KM',      // Rail lines (total route-km)
      'IS.AIR.PSGR',         // Air transport, passengers
      'EG.ELC.ACCS.ZS',      // Access to electricity
      'EG.ELC.PROD.KH',      // Electricity production
      'SH.H2O.BASW.ZS'       // Basic water services
    ]
  },
  
  'biotech': {
    'worldBank': [
      'SH.XPD.CHEX.GD.ZS',   // Health expenditure (% of GDP)
      'SH.XPD.CHEX.PC.CD',   // Health expenditure per capita
      'SP.DYN.LE00.IN',      // Life expectancy
      'SH.MED.BEDS.ZS',      // Hospital beds per 1,000
      'SH.MED.PHYS.ZS',      // Physicians per 1,000
      'GB.XPD.RSDV.GD.ZS',   // R&D expenditure
      'IP.PAT.RESD',         // Patent applications
      'TX.VAL.TECH.CD'       // High-technology exports
    ]
  },
  
  'medtech': {
    'worldBank': [
      'SH.XPD.CHEX.GD.ZS',   // Health expenditure (% of GDP)
      'SH.MED.BEDS.ZS',      // Hospital beds per 1,000
      'TX.VAL.TECH.CD',      // High-technology exports
      'GB.XPD.RSDV.GD.ZS',   // R&D expenditure
      'IP.PAT.RESD',         // Patent applications
      'NV.IND.MANF.ZS',      // Manufacturing value added
      'TX.VAL.MANF.ZS.UN'    // Manufactures exports
    ]
  },
  
  'mem': {
    'worldBank': [
      'TX.VAL.TECH.CD',      // High-technology exports
      'NV.IND.MANF.ZS',      // Manufacturing value added
      'GB.XPD.RSDV.GD.ZS',   // R&D expenditure
      'IP.PAT.RESD',         // Patent applications
      'TX.VAL.MANF.ZS.UN',   // Manufactures exports
      'NV.IND.TOTL.ZS',      // Industry value added
      'SL.IND.EMPL.ZS'       // Employment in industry
    ]
  },

  // NEW: Energy industry
  'energy': {
    'worldBank': [
      'EG.ELC.ACCS.ZS',      // Access to electricity (% of population)
      'EG.ELC.RNEW.ZS',      // Renewable electricity output (% of total)
      'EG.ELC.COAL.ZS',      // Electricity from coal (% of total)
      'EG.ELC.NGAS.ZS',      // Electricity from natural gas (% of total)
      'EG.ELC.NUCL.ZS',      // Electricity from nuclear (% of total)
      'EG.ELC.HYRO.ZS',      // Electricity from hydroelectric (% of total)
      'EG.FEC.RNEW.ZS',      // Renewable energy consumption (% of total)
      'EG.USE.PCAP.KG.OE',   // Energy use per capita (kg oil equivalent)
      'EG.GDP.PUSE.KO.PP',   // GDP per unit of energy use
      'EG.CFT.ACCS.ZS',      // Access to clean fuels for cooking
      'EG.ELC.LOSS.ZS',      // Electric power transmission losses
      'EG.IMP.CONS.ZS'       // Energy imports, net (% of energy use)
    ]
  },

  // NEW: Climate industry
  'climate': {
    'worldBank': [
      'EN.ATM.CO2E.PC',      // CO2 emissions (metric tons per capita)
      'EN.ATM.CO2E.KT',      // CO2 emissions (kt)
      'EN.ATM.METH.KT.CE',   // Methane emissions (kt of CO2 equivalent)
      'EN.ATM.NOXE.KT.CE',   // Nitrous oxide emissions (kt of CO2 equivalent)
      'EN.ATM.PM25.MC.M3',   // PM2.5 air pollution (micrograms per cubic meter)
      'EN.CLC.MDAT.ZS',      // Droughts, floods, extreme temperatures (% of population)
      'EN.POP.EL5M.ZS',      // Population in areas below 5m elevation (% of total)
      'EN.POP.DNST',         // Population density (people per sq. km)
      'EN.FSH.THRD.NO',      // Fish species, threatened
      'EN.MAM.THRD.NO',      // Mammal species, threatened
      'EN.BIR.THRD.NO',      // Bird species, threatened
      'AG.LND.FRST.ZS'       // Forest area (% of land area)
    ]
  }
};

module.exports = { INDUSTRY_INDICATORS };
