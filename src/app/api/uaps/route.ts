import { NextResponse } from "next/server";

const uaps = [
  {
    id: "uap_nimitz_tictac",
    title: "Nimitz Tic Tac encounter",
    classification: "Military declassified",
    shape: "Tic Tac",
    coordinates: { latitude: 31.41, longitude: -117.52 },
    altitude_ft: 20000,
    speed_mach: "Mach 2+",
    timestamp: "2004-11-14T14:30:00Z",
    location: "Pacific Ocean, west of Baja California",
    description:
      "USS Nimitz Carrier Strike Group aviators reported a white oblong object performing anomalous maneuvers near the training range.",
    sourceName: "U.S. Department of Defense / Navy UAP release",
    sourceUrl: "https://www.defense.gov/News/Releases/Release/Article/2165713/statement-by-the-department-of-defense-on-the-release-of-historical-navy-videos/",
  },
  {
    id: "uap_gimbal",
    title: "Gimbal video",
    classification: "Military declassified",
    shape: "Rotating aerial object",
    coordinates: { latitude: 30.08, longitude: -79.2 },
    altitude_ft: 25000,
    speed_mach: "Unknown",
    timestamp: "2015-01-21T00:00:00Z",
    location: "Atlantic Ocean, off the southeast United States",
    description:
      "Navy aircrew recorded an object apparently rotating against high-altitude winds during a military training event.",
    sourceName: "U.S. Department of Defense / Navy UAP release",
    sourceUrl: "https://www.defense.gov/News/Releases/Release/Article/2165713/statement-by-the-department-of-defense-on-the-release-of-historical-navy-videos/",
  },
  {
    id: "uap_go_fast",
    title: "GoFast video",
    classification: "Military declassified",
    shape: "Fast low-altitude object",
    coordinates: { latitude: 29.4, longitude: -77.6 },
    altitude_ft: 13000,
    speed_mach: "Unknown",
    timestamp: "2015-01-21T00:00:00Z",
    location: "Atlantic Ocean, off the southeast United States",
    description:
      "Navy aircrew tracked a small object moving rapidly above the ocean surface in infrared footage later released by the Pentagon.",
    sourceName: "U.S. Department of Defense / Navy UAP release",
    sourceUrl: "https://www.defense.gov/News/Releases/Release/Article/2165713/statement-by-the-department-of-defense-on-the-release-of-historical-navy-videos/",
  },
  {
    id: "uap_rendlesham",
    title: "Rendlesham Forest incident",
    classification: "Government archive / military witness reports",
    shape: "Lighted triangular craft",
    coordinates: { latitude: 52.09, longitude: 1.43 },
    altitude_ft: null,
    speed_mach: "Unknown",
    timestamp: "1980-12-26T03:00:00Z",
    location: "Rendlesham Forest, Suffolk, United Kingdom",
    description:
      "U.S. Air Force personnel stationed at RAF Woodbridge reported unusual lights and physical traces near Rendlesham Forest.",
    sourceName: "UK National Archives / Ministry of Defence files",
    sourceUrl: "https://discovery.nationalarchives.gov.uk/details/r/C10130124",
  },
  {
    id: "uap_tehran_1976",
    title: "Tehran 1976 radar-visual case",
    classification: "Declassified military intelligence report",
    shape: "Bright aerial object",
    coordinates: { latitude: 35.72, longitude: 51.33 },
    altitude_ft: null,
    speed_mach: "Unknown",
    timestamp: "1976-09-19T00:30:00Z",
    location: "Tehran, Iran",
    description:
      "Iranian Air Force interceptors and ground radar reportedly tracked a luminous object over Tehran, later summarized in declassified U.S. records.",
    sourceName: "U.S. Defense Intelligence Agency / declassified report",
    sourceUrl: "https://catalog.archives.gov/id/446391567",
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    source: "Declassified military and government UAP records",
    count: uaps.length,
    uaps,
    data: uaps,
    timestamp: new Date().toISOString(),
  });
}
