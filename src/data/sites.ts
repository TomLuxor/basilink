/**
 * Curated start and destination sites. Every entry names its source.
 * Shared with scripts/fetch-routes.ts, so keep this file free of browser APIs.
 *
 * To add a site: add an entry with a unique id, then run `npm run data:routes -- --missing`
 * to compute the driving routes for the new pairs.
 */

export type SiteKind = 'hospital' | 'lab'

export interface Site {
  /** Stable, URL-safe identifier, also used in route file names. */
  id: string
  name: string
  kind: SiteKind
  /** Type of facility as published by the source, translated to English. */
  category: string
  address: string
  /** WGS84 position as [longitude, latitude]. */
  position: [number, number]
  source: { label: string; url: string }
}

const BS_HOSPITALS = {
  label: 'Canton of Basel-Stadt, open data "Spitäler" (Opendata BY)',
  url: 'https://opendata.swiss/de/dataset/spitaler',
}

/** Position of a hospital area from the swisstopo gazetteer, found via the geo.admin.ch search. */
function geoAdminSearch(searchText: string) {
  return {
    label: `swisstopo gazetteer via geo.admin.ch search: "${searchText}"`,
    url: `https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&sr=4326&searchText=${encodeURIComponent(searchText)}`,
  }
}

export const SITES: Site[] = [
  // --- Hospitals in Basel-Stadt (positions from the cantonal open data set) ---
  {
    id: 'usb',
    name: 'University Hospital Basel (USB)',
    kind: 'hospital',
    category: 'Hospital, emergency department',
    address: 'Petersgraben 4, 4031 Basel',
    position: [7.583291, 47.562228],
    source: BS_HOSPITALS,
  },
  {
    id: 'ukbb',
    name: "University Children's Hospital Basel (UKBB)",
    kind: 'hospital',
    category: 'Hospital, emergency department',
    address: 'Spitalstrasse 33, 4031 Basel',
    position: [7.581656, 47.563629],
    source: BS_HOSPITALS,
  },
  {
    id: 'claraspital',
    name: 'St. Claraspital',
    kind: 'hospital',
    category: 'Hospital, emergency department',
    address: 'Kleinriehenstrasse 30, 4058 Basel',
    position: [7.614058, 47.566509],
    source: BS_HOSPITALS,
  },
  {
    id: 'bethesda',
    name: 'Bethesda Spital',
    kind: 'hospital',
    category: 'Hospital',
    address: 'Gellertstrasse 144, 4020 Basel',
    position: [7.617284, 47.54807],
    source: BS_HOSPITALS,
  },
  {
    id: 'merian-iselin',
    name: 'Merian Iselin Klinik',
    kind: 'hospital',
    category: 'Hospital',
    address: 'Föhrenstrasse 2, 4009 Basel',
    position: [7.569507, 47.555599],
    source: BS_HOSPITALS,
  },
  {
    id: 'schmerzklinik',
    name: 'Schmerzklinik Basel',
    kind: 'hospital',
    category: 'Private hospital',
    address: 'Hirschgässlein 11–13, 4051 Basel',
    position: [7.593214, 47.551065],
    source: BS_HOSPITALS,
  },
  {
    id: 'felix-platter',
    name: 'Felix Platter',
    kind: 'hospital',
    category: 'Geriatric hospital',
    address: 'Burgfelderstrasse 101, 4055 Basel',
    position: [7.565423, 47.56537],
    source: BS_HOSPITALS,
  },
  {
    id: 'adullam-basel',
    name: 'Adullam Basel',
    kind: 'hospital',
    category: 'Geriatric hospital',
    address: 'Mittlere Strasse 15, 4056 Basel',
    position: [7.57951, 47.560238],
    source: BS_HOSPITALS,
  },
  {
    id: 'adullam-riehen',
    name: 'Adullam Riehen',
    kind: 'hospital',
    category: 'Geriatric hospital',
    address: 'Schützengasse 60, 4125 Riehen',
    position: [7.655655, 47.585659],
    source: BS_HOSPITALS,
  },
  {
    id: 'upk',
    name: 'University Psychiatric Clinics Basel (UPK)',
    kind: 'hospital',
    category: 'Psychiatric hospital',
    address: 'Wilhelm Klein-Strasse 27, 4012 Basel',
    position: [7.565765, 47.571328],
    source: BS_HOSPITALS,
  },
  {
    id: 'sonnhalde',
    name: 'Klinik Sonnhalde',
    kind: 'hospital',
    category: 'Psychiatric hospital',
    address: 'Gänshaldenweg 28, 4125 Riehen',
    position: [7.657422, 47.584459],
    source: BS_HOSPITALS,
  },
  {
    id: 'rehab-basel',
    name: 'Rehab Basel',
    kind: 'hospital',
    category: 'Rehabilitation clinic',
    address: 'Im Burgfelderhof 40, 4012 Basel',
    position: [7.559015, 47.572653],
    source: BS_HOSPITALS,
  },
  {
    id: 'matthea',
    name: 'Geburtshaus Matthea',
    kind: 'hospital',
    category: 'Birth centre',
    address: 'Klybeckstrasse 64/70, 4057 Basel',
    position: [7.591307, 47.566006],
    source: BS_HOSPITALS,
  },

  // --- Hospitals in Basel-Landschaft (not in the Basel-Stadt data set) ---
  {
    id: 'ksbl-bruderholz',
    name: 'Cantonal Hospital Baselland, Bruderholz',
    kind: 'hospital',
    category: 'Hospital, emergency department',
    address: 'Bruderholz, 4101 Bruderholz (Binningen)',
    position: [7.581715, 47.527634],
    source: geoAdminSearch('Kantonsspital Bruderholz'),
  },
  {
    id: 'ksbl-liestal',
    name: 'Cantonal Hospital Baselland, Liestal',
    kind: 'hospital',
    category: 'Hospital, emergency department',
    address: 'Rheinstrasse 26, 4410 Liestal',
    position: [7.730868, 47.487732],
    source: geoAdminSearch('Kantonsspital Liestal'),
  },

  // --- Medical laboratories (address from the company, position from the geo.admin address search) ---
  {
    id: 'viollier-allschwil',
    name: 'Viollier AG, laboratory centre',
    kind: 'lab',
    category: 'Medical laboratory (staffed 24/7)',
    address: 'Hagmattstrasse 14, 4123 Allschwil',
    position: [7.543109, 47.557224],
    source: { label: 'Viollier AG website', url: 'https://www.viollier.ch/en/allschwil' },
  },
  {
    id: 'unilabs-basel',
    name: 'Unilabs Basel',
    kind: 'lab',
    category: 'Cytology and pathology laboratory',
    address: 'Aeschenvorstadt 57, 4051 Basel',
    position: [7.593902, 47.552216],
    source: {
      label: 'Unilabs centre directory',
      url: 'https://center.unilabs.ch/en/basel-city/basel/unilabs-basel-1553',
    },
  },
]
