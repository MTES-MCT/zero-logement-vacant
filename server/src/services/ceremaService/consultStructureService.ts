import db from "~/infra/database";
import { EstablishmentDbo } from "~/repositories/establishmentRepository";
import { v4 as uuidv4 } from 'uuid';

interface PerimeterType {
  reg_complet: string[];
  dep_complet: string[];
  comm_by_dep: {
    [key: string]: string[];
  };
}

export interface Structure {
  establishmentId: number;
  siret: string;
  name: string;
  perimeter: PerimeterType;
  kind: string;
}

export const getLocalitiesGeocode = async (perimeter: PerimeterType): Promise<string[]> => {
  let flattenedArray: string[] = [];

  for (const key in perimeter.reg_complet) {
    const geoCodes = await db.raw(`select codgeo from _localities where reg='${perimeter.reg_complet[key]}'`);
    flattenedArray = [...flattenedArray, ...geoCodes.rows.map((localities: { codgeo: string; }) => localities.codgeo)];
  }

  for (const key in perimeter.dep_complet) {
    const geoCodes = await db.raw(`select codgeo from _localities where dep='${perimeter.dep_complet[key]}'`);
    flattenedArray = [...flattenedArray, ...geoCodes.rows.map((localities: { codgeo: string; }) => localities.codgeo)];
  }

  for (const key in perimeter.comm_by_dep) {
    flattenedArray = [...flattenedArray, ...perimeter.comm_by_dep[key]];
  }

  return flattenedArray;
};

export const structureToEstablishment = async (structure: Structure): Promise<EstablishmentDbo> => {
  return {
    id: uuidv4(),
    name: structure.name,
    siren:  Number(structure.siret.substring(0, 9)),
    available: true,
    localities_geo_code: await getLocalitiesGeocode(structure.perimeter),
    kind: structure.kind,
    source: 'cerema',
    updated_at: new Date()
  };
};

export interface ConsultStructureService {
  consultStructure(id: number): Promise<Structure>;
}

export const TEST_STRUCTURES: ReadonlyArray<Structure> = [
  {
    establishmentId: 0,
    siret: "00000000000000",
    name: "Structure 0",
    perimeter: {
      "reg_complet": [],
      "dep_complet": [],
      "comm_by_dep": {
        "06": [
            "06029"
        ]
      }
    },
    kind: "Commune et commune nouvelle"
  },
  {
    establishmentId: 1,
    siret: "00000000000001",
    name: 'Structure 1',
    perimeter: {
      "reg_complet": [],
      "dep_complet": ["85"],
      "comm_by_dep": {},
    },
    kind: "Commune et commune nouvelle"
  }
];

export const getTestStructure = (id: number): Structure => {
  const structure =  TEST_STRUCTURES.find(structure => structure.establishmentId === id);
  if(structure === undefined) {
    throw new Error(`structure ${id} not found`);
  } else {
    return structure;
  }
};
