/**
 * Alappuzha district — police stations, sub-divisional DySP offices, and
 * district-level special-unit DySP offices. Sources: the District Police
 * Chief, Alappuzha's own "Administrative Office Sub Units" table (for the
 * 5 territorial sub-divisions and their stations) and the "Who is Who"
 * listing (for the special units) on alappuzha.keralapolice.gov.in,
 * cross-checked against individual station pages on ps.keralapolice.gov.in.
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

  // District-level special units, each headed by its own DySP — not tied
  // to a territorial sub-division, so they have no police stations under
  // them and only ever appear in the Police Office list, never Police
  // Station. Source: the "Who is Who" listing on
  // alappuzha.keralapolice.gov.in.
  const SPECIAL_UNITS = [
    'DySP, Special Branch, Alappuzha',
    'DySP, District Crime Branch, Alappuzha',
    'DySP, District Crime Records Bureau (DCRB), Alappuzha',
    'DySP, Narcotic Cell, Alappuzha',
  ];

  // District-level police stations that aren't part of a territorial
  // sub-division either (unlike the special units above, these ARE
  // police stations, so they belong in both the Police Office and
  // Police Station lists).
  const OTHER_STATIONS = [
    'Cyber Crime Police Station',
  ];

  const policeStations = SUB_DIVISIONS.flatMap((d) => d.stations).concat(OTHER_STATIONS).sort();
  const dyspOffices = SUB_DIVISIONS.map((d) => d.dysp).concat(SPECIAL_UNITS).sort();
  // Police Office covers stations, DySP/special-unit offices, and the
  // other stations above; Police Station (in the Crime No./Sec./PS
  // group) is all stations, sub-divisional or not.
  const policeOffices = policeStations.concat(dyspOffices).sort();

  window.ALAPPUZHA_POLICE = { SUB_DIVISIONS, SPECIAL_UNITS, policeStations, dyspOffices, policeOffices };
})();
