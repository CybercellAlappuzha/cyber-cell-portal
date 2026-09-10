/**
 * Alappuzha district — police stations and DySP offices, grouped by
 * sub-division. Source: the District Police Chief, Alappuzha's own
 * "Administrative Office Sub Units" table
 * (alappuzha.keralapolice.gov.in), cross-checked against individual
 * station pages on ps.keralapolice.gov.in. Five sub-divisions, each
 * headed by a DySP office, cover the whole district.
 *
 * Used to populate the Police Office / Police Station suggestion lists
 * in app.js — kept as one data file so it's easy to update if a new
 * station opens or a DySP office is renamed, without touching app.js.
 */
(function () {
  const SUB_DIVISIONS = [
    {
      dysp: 'DySP Office, Alappuzha',
      stations: [
        'Alappuzha North Police Station',
        'Alappuzha South Police Station',
        'Mannanchery Police Station',
        'Mararikkulam Police Station',
        'Vanitha Police Station',
      ],
    },
    {
      dysp: 'DySP Office, Ambalappuzha',
      stations: [
        'Ambalappuzha Police Station',
        'Edathua Police Station',
        'Kainady Police Station',
        'Nedumudy Police Station',
        'Pulincunnu Police Station',
        'Punnapra Police Station',
        'Ramankary Police Station',
      ],
    },
    {
      dysp: 'DySP Office, Cherthala',
      stations: [
        'Aroor Police Station',
        'Arthunkal Police Station',
        'Cherthala Police Station',
        'Kuthiathode Police Station',
        'Muhamma Police Station',
        'Pattanakkad Police Station',
        'Poochackal Police Station',
      ],
    },
    {
      dysp: 'DySP Office, Chengannur',
      stations: [
        'Chengannur Police Station',
        'Kurathikad Police Station',
        'Mannar Police Station',
        'Mavelikkara Police Station',
        'Noornad Police Station',
        'Vallikunnam Police Station',
        'Venmony Police Station',
      ],
    },
    {
      dysp: 'DySP Office, Kayamkulam',
      stations: [
        'Haripad Police Station',
        'Kanakakunnu Police Station',
        'Kareelakulangara Police Station',
        'Kayamkulam Police Station',
        'Thrikkunnappuzha Police Station',
        'Veeyapuram Police Station',
      ],
    },
  ];

  const policeStations = SUB_DIVISIONS.flatMap((d) => d.stations).sort();
  const dyspOffices = SUB_DIVISIONS.map((d) => d.dysp).sort();
  // Police Office covers both a station and a DySP office; Police Station
  // (in the Crime No./Sec./PS group) is stations only.
  const policeOffices = policeStations.concat(dyspOffices).sort();

  window.ALAPPUZHA_POLICE = { SUB_DIVISIONS, policeStations, dyspOffices, policeOffices };
})();
