export interface WeeklyClass {
  id: string;
  day: number;
  slot: string;
  time: string;
  name: string;
  level: string;
  teacherIds: string[];
  duration: number;
  roleCapacity: { chico: number; chica: number };
  room: string;
}

export const ACADEMY_TEACHERS = [
  { id: 'ruben', name: 'Rubén' },
  { id: 'paula', name: 'Paula' },
  { id: 'igor', name: 'Igor' },
  { id: 'monica', name: 'Mónica' },
  { id: 'pablo', name: 'Pablo' },
  { id: 'maria', name: 'María' },
  { id: 'juan', name: 'Juan' },
  { id: 'kiko', name: 'Kiko' },
  { id: 'javi', name: 'Javi' },
  { id: 'rebeca', name: 'Rebeca' },
] as const;

function lesson(
  id: string,
  day: number,
  time: string,
  name: string,
  level: string,
  teacherIds: string[],
): WeeklyClass {
  return {
    id,
    day,
    slot: `${time.slice(0, 2)}:00`,
    time,
    name,
    level,
    teacherIds,
    duration: 60,
    roleCapacity: { chico: 10, chica: 10 },
    room: id === 'martes-18-men' ? 'Sala 2' : 'Sala 1',
  };
}

export const WEEKLY_CLASSES: WeeklyClass[] = [
  lesson('lunes-18', 0, '18:00', 'Salsa Línea', 'Inicio', ['ruben', 'paula']),
  lesson('lunes-19', 0, '19:00', 'Bachata Sensual', 'Intermedio', ['ruben', 'paula']),
  lesson('martes-17', 1, '17:00', 'Competición Kids', '', ['paula']),
  lesson('martes-18-sexy', 1, '18:00', 'Sexy Style', '', ['paula']),
  lesson('martes-18-men', 1, '18:00', 'Men Style', '', ['igor']),
  lesson('martes-19', 1, '19:00', 'Bachata Sensual', 'Intermedio / Avanzado', [
    'igor',
    'monica',
  ]),
  lesson('martes-20', 1, '20:00', 'Coreográfico Lady Bachata', '', ['monica']),
  lesson('martes-21', 1, '21:00', 'Bachata & Roze', '', []),
  lesson('miercoles-18', 2, '18:00', 'Salsa Cubana', 'Intermedio', ['pablo', 'maria']),
  lesson('miercoles-19', 2, '19:00', 'Salsa Línea', 'Intermedio', ['pablo', 'monica']),
  lesson('miercoles-20', 2, '20:00', 'Bachata Sensual', 'Intermedio 2', ['ruben', 'monica']),
  lesson('miercoles-21', 2, '21:00', 'Bachata', 'Inicio', ['ruben', 'maria']),
  lesson('jueves-18', 3, '18:00', 'Bachata', 'Inicio', ['juan', 'paula']),
  lesson('jueves-19', 3, '19:00', 'Salsa Cubana', 'Inicio', ['kiko', 'paula']),
  lesson('jueves-20', 3, '20:00', 'Bachata Sensual', 'Inicio 2 Plus', ['javi', 'monica']),
  lesson('jueves-21', 3, '21:00', 'Bachata Sensual', 'Avanzado', ['javi', 'monica']),
  lesson('viernes-1930', 4, '19:30', 'Bachata + Salsa Cubana', 'Inicio', ['kiko', 'rebeca']),
];

export function weeklyTeacherNames(teacherIds: string[]): string[] {
  return teacherIds.map(
    (id) => ACADEMY_TEACHERS.find((teacher) => teacher.id === id)?.name ?? id,
  );
}
