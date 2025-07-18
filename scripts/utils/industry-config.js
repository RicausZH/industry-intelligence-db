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
  },

  'context': {
    'worldBank': [
      // Economic Foundation
      'NY.GDP.MKTP.KD.ZG',   // GDP growth (annual %)
      'NY.GDP.PCAP.KD',      // GDP per capita (constant 2015 US$)
      'NY.GDP.PCAP.PP.KD',   // GDP per capita, PPP (constant 2017 international $)
      'FP.CPI.TOTL.ZG',      // Inflation, consumer prices (annual %)
      'NE.TRD.GNFS.ZS',      // Trade (% of GDP)
      
      // Human Capital Foundation
      'SE.TER.ENRR',         // School enrollment, tertiary (% gross)
      'SE.TER.ENRR.FE',      // Tertiary enrollment, female (% gross)
      'SE.TER.ENRR.MA',      // Tertiary enrollment, male (% gross)
      'SE.ADT.LITR.ZS',      // Literacy rate, adult total (% of people ages 15+)
      'SL.UEM.TOTL.ZS',      // Unemployment, total (% of total labor force)
      
      // Business Environment
      'IC.BUS.EASE.XQ',      // Ease of doing business rank
      'IC.REG.DURS',         // Time required to start a business (days)
      'IC.REG.COST.PC.ZS',   // Cost of business start-up procedures (% of GNI per capita)
      'IC.TAX.TOTL.CP.ZS',   // Total tax and contribution rate (% of profit)
      
      // Institutional Quality
      'IQ.CPA.PROP.XQ',      // CPIA property rights and rule-based governance rating
      'IQ.CPA.TRAN.XQ',      // CPIA transparency, accountability, and corruption rating
      'IQ.CPA.FINS.XQ',      // CPIA financial sector rating
      'IQ.CPA.DEBT.XQ',      // CPIA debt policy rating
      
      // Social Development
      'SI.POV.DDAY',         // Poverty headcount ratio at $2.15 a day (2017 PPP)
      'SI.POV.GINI',         // Gini index
      'SP.URB.TOTL.IN.ZS',   // Urban population (% of total)
      'SP.POP.GROW',         // Population growth (annual %)
      'SP.POP.65UP.TO.ZS'    // Population ages 65 and above (% of total)
    ]
  },

  // NEW: Innovation Industry
  'innovation': {
    'worldBank': [
      'GB.XPD.RSDV.GD.ZS',   // Research and development expenditure (% of GDP)
      'IP.PAT.RESD',         // Patent applications, residents
      'IP.PAT.NRES',         // Patent applications, nonresidents
      'IP.TMK.RESD',         // Trademark applications, residents
      'IP.TMK.NRES',         // Trademark applications, nonresidents
      'IP.IDS.RSCT',         // Industrial design applications, resident
      'IP.IDS.NRCT',         // Industrial design applications, nonresident
      'IP.JRN.ARTC.SC',      // Scientific and technical journal articles
      'TX.VAL.TECH.MF.ZS',   // High-technology exports (% of manufactured exports)
      'SP.POP.SCIE.RD.P6',   // Researchers in R&D (per million people)
      'BX.GSR.ROYL.CD',      // Charges for use of intellectual property, receipts
      'BM.GSR.ROYL.CD'       // Charges for use of intellectual property, payments
    ]
  },

  // NEW: Finance Industry
  'finance': {
    'worldBank': [
      'FS.AST.DOMS.GD.ZS',   // Domestic credit provided by financial sector (% of GDP)
      'FS.AST.PRVT.GD.ZS',   // Domestic credit to private sector (% of GDP)
      'FD.AST.PRVT.GD.ZS',   // Domestic credit to private sector by banks (% of GDP)
      'FR.INR.LEND',         // Lending interest rate (%)
      'FR.INR.DPST',         // Deposit interest rate (%)
      'FR.INR.RINR',         // Real interest rate (%)
      'BX.KLT.DINV.WD.GD.ZS', // Foreign direct investment, net inflows (% of GDP)
      'BX.PEF.TOTL.CD.WD',   // Portfolio equity, net inflows (BoP, current US$)
      'CM.MKT.LCAP.GD.ZS',   // Market capitalization of listed companies (% of GDP)
      'CM.MKT.TRAD.GD.ZS',   // Stocks traded, total value (% of GDP)
      'GFDD.DI.14',          // Bank capital to assets ratio (%)
      'GFDD.SI.01'           // Stock market capitalization to GDP (%)
    ]
  },

  // NEW: Trade Industry
  'trade': {
    'worldBank': [
      'NE.EXP.GNFS.ZS',      // Exports of goods and services (% of GDP)
      'NE.IMP.GNFS.ZS',      // Imports of goods and services (% of GDP)
      'NE.TRD.GNFS.ZS',      // Trade (% of GDP)
      'BX.GSR.GNFS.CD',      // Exports of goods and services (current US$)
      'BM.GSR.GNFS.CD',      // Imports of goods and services (current US$)
      'BN.CAB.XOKA.GD.ZS',   // Current account balance (% of GDP)
      'TX.VAL.MANF.ZS.UN',   // Manufactures exports (% of merchandise exports)
      'TM.VAL.MANF.ZS.UN',   // Manufactures imports (% of merchandise imports)
      'TX.VAL.FUEL.ZS.UN',   // Fuel exports (% of merchandise exports)
      'TM.VAL.FUEL.ZS.UN',   // Fuel imports (% of merchandise imports)
      'TX.VAL.MMTL.ZS.UN',   // Ores and metals exports (% of merchandise exports)
      'TM.VAL.MMTL.ZS.UN'    // Ores and metals imports (% of merchandise imports)
    ]
  }
};

module.exports = { INDUSTRY_INDICATORS };
