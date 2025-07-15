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
  }
};

module.exports = { INDUSTRY_INDICATORS };
