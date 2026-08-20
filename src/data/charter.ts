/**
 * El código de CRTQ — the members-only charter of the CRTQ community (the
 * "secret" Dine Club section). CRTQ is the community arm of NO MAD CORNER: a
 * private register where the people who eat in this city tell each other the
 * truth. The content is in Spanish by design — the club writes as it speaks.
 *
 * Kept as structured data so the members screen can render it section by
 * section. Verbatim to the founding text; edit here to amend the charter.
 */

export type Rule = { n: string; body: string };
export type VerdictRow = { name: string; meaning: string };
export type Channel = {
  tag: string;
  name: string;
  intro: string;
  goes: string;
  notGoes: string;
  template: string[];
  rules: string[];
};
export type Format = { name: string; what: string; leaves: string };
export type TimelineRow = { day: string; what: string };
export type Role = { name: string; body: string };

export type CharterSection = {
  id: string; // "00"
  short: string; // chip label, e.g. "Qué es"
  title: string; // "Qué es CRTQ"
};

/** The section index shown as chips at the top of the charter. */
export const CHARTER_INDEX: CharterSection[] = [
  { id: '00', short: 'Qué es', title: 'Qué es CRTQ' },
  { id: '01', short: 'La casa', title: 'Las reglas de la casa' },
  { id: '02', short: 'Veredicto', title: 'El sistema de veredicto' },
  { id: '03', short: 'Canales', title: 'Los canales' },
  { id: '04', short: 'Dine Club', title: 'DINE CLUB' },
  { id: '05', short: 'Roles', title: 'Roles' },
  { id: '06', short: 'Moderación', title: 'Moderación' },
  { id: '07', short: 'Qué no es', title: 'Lo que CRTQ no es' },
];

export const WHAT_PARAS: string[] = [
  'CRTQ es la palabra crítica sin vocales. Le quitamos lo blando a propósito.',
  'Es el brazo comunitario de NO MAD CORNER: el lugar donde la gente que come en esta ciudad se dice la verdad entre sí, antes de que la verdad pase por una cámara, un micrófono o una página editada. Aquí no hay comunicados, no hay canjes, no hay listas patrocinadas. Hay comensales que pagan su cuenta y escriben lo que vivieron.',
  'Partimos de una sola idea: la comida nunca es solo comida. Un puesto de tacos y una barra de doce asientos merecen exactamente la misma atención. Ninguno merece menos rigor por barato, ninguno merece más indulgencia por caro.',
  'CRTQ no existe para hacer campañas ni para hundir negocios. Existe para dejar constancia.',
];
export const WHAT_LANG =
  'Idioma: español. Escribe como hablas. No necesitas prosa bonita, necesitas ser específico.';

export const HOUSE_INTRO = 'Aplican en todos los canales, sin excepción.';
export const HOUSE_RULES: Rule[] = [
  { n: 'Nº01', body: 'Se paga la cuenta. Si te invitaron, si eras cortesía de la casa, si trabajas ahí o si conoces al dueño: se declara en la primera línea del post. No te expulsa de la conversación, pero cambia el peso de lo que dices.' },
  { n: 'Nº02', body: 'Sé específico o no publiques. “Estuvo increíble” no es información. Qué pediste, cuánto costó, cuánto tardó, cómo llegó a la mesa, qué harías distinto. Lo concreto vale más que lo elegante.' },
  { n: 'Nº03', body: 'Geo-sello obligatorio. Todo post que mencione un lugar lleva: Lugar · colonia · ciudad. Sin excepción. Es lo que hace buscable esta comunidad dentro de seis meses.' },
  { n: 'Nº04', body: 'Se juzga el plato, nunca a la persona. Puedes decir que un restaurante no funciona. No puedes hablar del físico, el acento, el origen ni la vida privada de quien te atendió. Un mesero que tuvo mal día no es una nota; un servicio mal diseñado sí lo es. Nombres propios de empleados: no se publican.' },
  { n: 'Nº05', body: 'Sin filtros. Fotos bienvenidas y necesarias. Sin edición que cambie el color real de la comida, sin IA, sin imágenes que no tomaste tú. Si la luz estaba fea, la luz estaba fea. Eso también es información.' },
  { n: 'Nº06', body: 'Lo que se dice en CRTQ se queda en CRTQ. Nada de capturas hacia afuera. Nada de mandarle el post de alguien al restaurante del que habla. Si quieres que algo salga de aquí, pídelo primero a la persona que lo escribió.' },
  { n: 'Nº07', body: 'Sin publicidad. No se promocionan negocios propios, no se venden servicios, no se reclutan clientes. Si eres dueño, cocinero, PR o proveedor, ponlo en tu nombre de usuario. Puedes participar. No puedes vender.' },
  { n: 'Nº08', body: 'Escríbelo tú. Reseñas generadas con IA: fuera. Sin discusión y sin segunda oportunidad.' },
  { n: 'Nº09', body: 'No se reseña lo que no comiste. Ni de oídas, ni por el menú, ni por lo que viste en redes. Si no lo pasaste por la boca, no tiene veredicto.' },
];

export const VERDICT_INTRO =
  'CRTQ no usa estrellas, ni puntajes, ni calificaciones sobre diez. Un número finge una precisión que nadie tiene. Usamos tres veredictos y solo tres:';
export const VERDICTS: VerdictRow[] = [
  { name: 'De paso', meaning: 'Cumple. Comerías bien si ya estás cerca. No modificarías tu día por ello.' },
  { name: 'Vale el viaje', meaning: 'Justifica el traslado, el tráfico y la espera. Hay una decisión ahí que no está en otra parte.' },
  { name: 'Imprescindible', meaning: 'Cambia tu idea de lo que ese platillo, esa cocina o esa ciudad pueden ser. Se usa poco. Por eso pesa.' },
];
export const AVISO_PARAS: string[] = [
  'Sobre lo negativo: un mal lugar no recibe veredicto, recibe un AVISO. Un veredicto es un juicio sobre una cocina; un aviso es un reporte de hechos. Un aviso exige fechas, montos y descripción de lo que pasó. No exige adjetivos.',
  'Un veredicto necesita al menos una visita completa. Un AVISO puede nacer de una sola experiencia mala, siempre que se declare como tal.',
];

export const CHANNELS: Channel[] = [
  {
    tag: '#RECS',
    name: 'Recomendaciones y avisos',
    intro: 'El registro público de la comunidad. Aquí va lo que ya comiste, con veredicto.',
    goes: 'Lugares que quieres recomendar, lugares que quieres advertir, regresos a un clásico que cambió, hallazgos de banqueta, hallazgos de mantel.',
    notGoes: 'Preguntas (esas van a ASKS), rumores (SCOOPS), aperturas que aún no visitas (SCOOPS).',
    template: [
      '[VEREDICTO o AVISO]',
      'Lugar · colonia · ciudad',
      'Fecha de visita · cuántos éramos · cuánto salió por persona',
      'Qué pedimos:',
      'Qué funcionó:',
      'Qué no:',
      'Volvería para:',
      'Declaración: cuenta pagada / cortesía / trabajo aquí',
    ],
    rules: [
      'Un post por visita. No se edita el veredicto después; si cambiaste de opinión, se publica un post nuevo y se enlaza al anterior.',
      'Discrepar es bienvenido y se hace en hilo, no en canal aparte.',
      'Prohibido el “no vayan” sin hechos. Un AVISO sin fechas ni descripción se borra.',
      'Cadenas y franquicias: se aceptan, pero se nombra la sucursal exacta.',
    ],
  },
  {
    tag: '#ASKS',
    name: 'Peticiones',
    intro: 'Para cuando necesitas que la comunidad resuelva algo concreto.',
    goes: '“Dónde como X”, “qué hay bueno cerca de Y”, “necesito lugar para cena de trabajo de ocho personas con presupuesto de Z”, “quién hace bien esta cocina en la ciudad”.',
    notGoes: 'Preguntas sin contexto. “¿Dónde como bien?” no es una pregunta, es un suspiro.',
    template: [
      'Busco: [tipo de cocina o platillo]',
      'Zona: [colonia o radio aceptable]',
      'Presupuesto por persona:',
      'Ocasión: [trabajo · pareja · familia · solo · celebración]',
      'Restricciones: [dieta, ruido, estacionamiento, horario, con niños]',
      'Ya descarté:',
    ],
    rules: [
      'Toda respuesta debe incluir geo-sello. Un nombre suelto no ayuda a nadie.',
      'Responde solo si comiste ahí. “Escuché que está bueno” no es una recomendación, es un rumor y va a SCOOPS.',
      'Quien pregunta cierra el hilo: cuando ya fuiste, regresas a decir a dónde acabaste yendo y publicas tu veredicto en RECS. Esto no es cortesía, es la regla que mantiene vivo el canal.',
    ],
  },
  {
    tag: '#SCOOPS',
    name: 'Información de adentro',
    intro: 'Lo que todavía no es noticia. Aperturas, cierres, cambios de chef, mudanzas, cocinas que van a abrir en tres meses, el local que lleva vacío desde marzo y ya tiene permiso.',
    goes: 'Primicias, avistamientos, letreros nuevos, permisos, contrataciones, menús filtrados, proyectos en obra.',
    notGoes: 'Chismes personales, problemas laborales de terceros con nombre y apellido, denuncias sin sustento, capturas de conversaciones privadas.',
    template: [
      '[APERTURA · CIERRE · CAMBIO · RUMOR]',
      'Lugar o proyecto · colonia · ciudad',
      'Confirmación: confirmado / probable / rumor',
      'Fuente: la vi yo / me lo dijeron / publicado en [medio]',
      'Fecha estimada:',
      'Detalle:',
    ],
    rules: [
      'Etiqueta tu certeza. Confirmado, probable o rumor. Publicar un rumor como hecho es la falta más grave de este canal.',
      'No se queman proyectos que pidieron discreción. Si alguien te contó algo en confianza, esa confianza no es tuya para gastarla.',
      'No se publica información laboral sensible de personas identificables.',
      'Si una primicia de SCOOPS se convierte en material editorial de NO MAD CORNER, se acredita a quien la trajo, salvo que pida anonimato.',
    ],
  },
  {
    tag: '#EVENTS',
    name: 'Agenda',
    intro: 'Todo lo que tiene fecha y se puede ir a ver.',
    goes: 'Cenas a cuatro manos, colaboraciones, pop-ups, festivales, mercados, catas, ferias de productor, clases abiertas, presentaciones de libro, ciclos de cine gastronómico, lanzamientos de NO MAD CORNER.',
    notGoes: 'Promociones de martes 2x1, happy hours, publicidad de negocio propio.',
    template: [
      '[EVENTO]',
      'Nombre · lugar · colonia · ciudad',
      'Fecha y hora',
      'Costo · si requiere boleto o reserva',
      'Quién cocina o participa',
      'Enlace',
      'Por qué vale la pena:',
    ],
    rules: [
      'Se publica con mínimo cinco días de anticipación. Un evento que ya pasó se archiva.',
      'Si tienes relación con el evento (organizas, cocinas, patrocinas, te invitaron), se declara.',
      'Después del evento: la crónica va a RECS con veredicto, no aquí.',
    ],
  },
  {
    tag: '#DINECLUB',
    name: 'Chat general y sede de DINE CLUB',
    intro:
      'El canal de conversación abierta y la casa de DINE CLUB. Aquí cabe lo que no cabe en otro lado: dudas de técnica, discusiones de sobremesa, precios, propinas, qué está pasando con la industria, quejas legítimas, entusiasmos sin estructura, presentarse cuando acabas de entrar. También es donde se organiza cada edición de DINE CLUB: candidatos, votación, listas, puntos de encuentro y bitácoras.',
    goes: 'Lo que no cabe en otro canal, y la organización de cada edición de DINE CLUB.',
    notGoes: 'Es el único canal donde se permite divagar. Sigue siendo el canal donde aplican las reglas de la casa.',
    template: [],
    rules: [],
  },
];

export const DINECLUB_INTRO: string[] = [
  'La mesa quincenal de CRTQ. Comer juntos, aprender juntos, abrir puertas.',
  'Cada dos semanas, martes. Mismo día, misma hora, siempre. La mesa se pone sin que nadie tenga que convocarla: se sabe que el martes hay mesa, y quien llega, se sienta.',
  'DINE CLUB no es una agenda de restaurantes. Es la parte de CRTQ que ocurre en persona, y su trabajo es doble: hacer comunidad entre quienes comemos en esta ciudad, y entender cómo funciona la comida antes de llegar al plato. Quien siembra, quien muele, quien reparte, quien hornea de madrugada, quien cocina, quien sirve, quien lava. Todo eso es la escena. El restaurante es apenas donde termina.',
  'De la mesa compartida toma la forma: una sola mesa larga, un pedido que se decide en conjunto, todos comiendo lo mismo al mismo tiempo, sobremesa larga y sin prisa. De la comunidad toma la regla: no se entra por invitación ni por currículum, no hay mesa de honor, y el lugar de quien viene por primera vez vale igual que el de quien no ha faltado nunca.',
  'No hay que saber de comida para venir. No hay que haber publicado nada. No hay que tener paladar entrenado. Se entrena sentándose.',
];
export const FORMATS: Format[] = [
  { name: 'La mesa', what: 'Un restaurante, una mesa larga, la carta cubierta entre todos, media hora con quien manda en la cocina', leaves: 'Veredicto en RECS · bitácora de operación' },
  { name: 'El origen', what: 'Una mañana en un mercado, un molino, una tortillería, una panadería, una pescadería, un rancho, una tostadora', leaves: 'Bitácora · sin veredicto' },
  { name: 'La casa', what: 'Alguien de CRTQ cocina para la mesa en su propia cocina. Se llega con algo, se lava entre todos', leaves: 'Nada publicable, salvo la receta si quien cocinó la comparte' },
  { name: 'El taller', what: 'Alguien que sabe hacer algo lo enseña durante dos horas: masa, fermentos, corte, barra, café, fuego', leaves: 'Bitácora de técnica' },
  { name: 'El recorrido', what: 'Una colonia a pie, tres o cuatro paradas de banqueta, una sola noche', leaves: 'Veredictos cortos en RECS' },
];
export const FORMATS_NOTE: string[] = [
  'De cada cuatro ediciones, al menos dos ocurren fuera de un restaurante. Un club que solo va a restaurantes es un grupo de consumo. La gracia está en ver la cadena completa, y en que sentarse a la mesa no dependa de tener presupuesto para cenar fuera cada quince días.',
  'Solo La mesa y El recorrido producen veredicto. Lo que se aprende en un taller, en una casa o en un mercado no se juzga: se registra y se agradece.',
];
export const TIMELINE: TimelineRow[] = [
  { day: 'T menos 12', what: 'El anfitrión abre tres candidatos en DINECLUB, con formato y rango de gasto por persona' },
  { day: 'T menos 10', what: 'Votación abierta · 48 horas · vota quien va y quien no va' },
  { day: 'T menos 7', what: 'Se abre la lista · se publica el tope de gasto y el punto de encuentro' },
  { day: 'T menos 2', what: 'Confirmación · si te bajas, avisas y ya, tu lugar pasa a quien sigue' },
  { day: 'Día 0', what: 'Nos juntamos 15 minutos antes, afuera, y entramos en grupo' },
  { day: 'T más 3', what: 'Quien tenga veredicto lo publica en RECS' },
  { day: 'T más 5', what: 'El anfitrión publica la bitácora' },
];
export const DINECLUB_RULES: Rule[] = [
  { n: 'Nº01', body: 'Puerta abierta. Cualquiera de CRTQ puede venir a su primera edición sin méritos previos. Si el cupo se llena, los de primera vez tienen prioridad sobre los de siempre. Un club que se cierra sobre sus habituales deja de crecer y empieza a oler a camarilla.' },
  { n: 'Nº02', body: 'Puedes traer a alguien. Un acompañante por persona, esté o no en CRTQ. Así se abren las puertas: la mitad de esta comunidad va a llegar porque alguien la trajo a cenar una vez. Quien invita responde por su invitado y le explica las reglas antes de llegar.' },
  { n: 'Nº03', body: 'Mesa de 8 a 12. Más que eso deja de ser una mesa y se vuelve un evento. En recorridos y visitas de mañana el cupo puede ser mayor. Si sobra gente, no se le dice que no: se arma segunda mesa el mismo día o se le aparta el primer lugar de la siguiente.' },
  { n: 'Nº04', body: 'Nadie se sienta solo. A cada persona nueva le toca un padrino de mesa: alguien que ya vino, que le escribe antes, que lo busca en el punto de encuentro y que se sienta junto a él. No es formalidad. Es la diferencia entre volver y no volver.' },
  { n: 'Nº05', body: 'Nadie se queda fuera por dinero. El tope de gasto se publica siete días antes y no se mueve. Si la cuenta amenaza con pasarse, se pide menos, no se pide que la gente estire. El que quiera botella cara la pide aparte y la paga aparte. Cuenta dividida en partes iguales sobre lo compartido, propina no menor al 15 por ciento. Y al menos una edición por trimestre es gratuita o casi: un mercado, una casa, una banqueta. Nadie debería tener que ausentarse tres meses seguidos por no traer con qué.' },
  { n: 'Nº06', body: 'Se rota todo. Formato, zona, cocina y precio. No dos visitas caras seguidas, no dos veces la misma colonia, no dos veces lo mismo. Un martes puede ser barra de veinte asientos y el siguiente un molino a las siete de la mañana. Si DINE CLUB se vuelve un club de restaurantes caros, dejó de servir para lo que fue hecho.' },
  { n: 'Nº07', body: 'El anfitrión llega primero y se va al último. Rota cada edición, nadie dos veces seguidas, prioridad para quien nunca lo ha hecho. Su trabajo no es lucirse: es reservar una sola mesa larga, avisar el tope de gasto, saludar por nombre a cada quien llegue, proponer el pedido y ajustarlo con lo que la mesa quiera, y asegurarse de que nadie se quede callado toda la noche ni se vaya solo al estacionamiento.' },
  { n: 'Nº08', body: 'Se llega como colega, no como inspección. No entramos de incógnito, a ningún lado. Se contacta con anticipación, se explica qué es CRTQ, se llega puntual y se libera la mesa a tiempo. La media hora con la cocina se pide antes o después del servicio, nunca durante. En mercados, talleres y bodegas se llega a la hora que le sirva a quien trabaja ahí, no a la que nos acomode. Un grupo de doce es una carga en cualquier lado: que valga la pena tenernos.' },
  { n: 'Nº09', body: 'La pregunta es de todos y empieza quien viene por primera vez. En el rato con la cocina, el productor o el tallerista, cada quien tiene derecho a una pregunta, y abre el más nuevo de la mesa. Las preguntas obvias son las mejores y las hace quien todavía no aprendió a tener pena.' },
  { n: 'Nº10', body: 'Se paga todo, sin excepción. No se pide descuento, no se pide mesa gratis, no se negocia la cuenta. Si hay cortesías, se declaran en la bitácora y se agradecen sin que eso toque el veredicto. Si la cortesía es tan grande que compromete el juicio, se declina con una sonrisa. Cuando alguien abre su casa, su taller o su bodega, no se llega con las manos vacías y no se deja el tiradero para el que invitó.' },
  { n: 'Nº11', body: 'La silla del gremio. Cada edición aparta un lugar para alguien que trabaja en comida y no está en CRTQ: un cocinero de línea, una mesera, un panadero, un repartidor, un lavaloza. Su consumo lo cubre la mesa. Nunca es de la casa que estamos visitando esa noche, para no comprometer a nadie. Es la manera más directa que tenemos de abrir la puerta hacia el otro lado de la barra.' },
  { n: 'Nº12', body: 'En la mesa se platica. El veredicto se escribe solo. Discute, contradice, defiende tu platillo favorito, cámbiate de lugar al segundo tiempo para no hablar toda la noche con la misma persona. Eso es la cena. Pero tu veredicto en RECS lo escribes antes de leer el de los demás, dentro de las 72 horas. La sobremesa es colectiva; el juicio es tuyo.' },
  { n: 'Nº13', body: 'Sin condescendencia. Si alguien no conoce un ingrediente, una técnica o un platillo, se le explica de buena gana y sin espectáculo. Nadie corrige la pronunciación de nadie. El que usa la mesa para demostrar cuánto sabe está cenando consigo mismo, y para eso no hace falta reservar doce lugares.' },
  { n: 'Nº14', body: 'Avisa y ya. Si no vas, avisas y no debes explicaciones. Faltar sin avisar deja una silla pagada vacía y a alguien afuera de la lista, así que se pide el mensaje, no el castigo. Tres plantones seguidos y el anfitrión te escribe para preguntarte si todo bien, no para correrte.' },
  { n: 'Nº15', body: 'La bitácora es del anfitrión, el crédito es de la mesa. Un post en DINECLUB con lo que se aprendió: proveedores, mermas, tiempos, decisiones de menú, estructura de costos, técnica, precios de origen, lo que la casa haya autorizado compartir. Se nombra a quien hizo la pregunta que sacó lo bueno. Lo que se pidió mantener en privado, se mantiene en privado.' },
  { n: 'Nº16', body: 'Lo que ves adentro se respeta. Fotos de cocina, taller, bodega y servicio solo con permiso explícito. Nada de grabar a nadie sin avisar. La foto de la mesa al final sí, siempre, sin filtros: es el registro de quiénes estuvimos.' },
  { n: 'Nº17', body: 'Nadie se va solo. Se sale en grupo, se acompaña a quien pidió transporte hasta que llegue, se escribe al chat cuando cada quien llega a su casa. Es lo que uno hace cuando invita gente a cenar a su casa, y aquí la mesa es de todos.' },
];
export const DINECLUB_BECOME =
  'Una visita de DINE CLUB puede escalar a episodio de Una misma historia, a nota escrita o a corto documental de NO MAD CORNER. Cuando eso pase, se avisa al restaurante antes de grabar y se acredita a la comunidad. La comunidad no se usa como equipo de producción gratuito ni como pretexto para entrar a lugares con la cámara escondida.';

export const ROLES: Role[] = [
  { name: 'Comensal', body: 'Todos al entrar. Puede publicar en todos los canales, proponer candidatos a DINE CLUB y venir a la mesa desde el primer día.' },
  { name: 'Padrino de mesa', body: 'Quien ya vino a una cena y acompaña a alguien nuevo en la siguiente. Se ofrece, no se nombra.' },
  { name: 'Anfitrión', body: 'Organiza una edición de DINE CLUB. Rotativo, con prioridad para quien nunca lo ha hecho.' },
  { name: 'Editorial', body: 'Equipo de NO MAD CORNER. Modera, archiva y decide qué escala a la plataforma.' },
];

export const MOD_INTRO = 'Tres avisos y salida. Sin drama, sin hilo público, sin debate.';
export const MOD_IMMEDIATE_LEAD = 'Salida inmediata, sin aviso previo, por:';
export const MOD_IMMEDIATE: string[] = [
  'Publicidad encubierta o veredictos pagados',
  'Reseñas escritas con IA',
  'Filtrar contenido de CRTQ hacia un restaurante o hacia afuera',
  'Ataques personales a trabajadores del sector',
  'Campañas coordinadas contra un negocio',
];
export const MOD_REPLY =
  'Los AVISOS graves se conservan aunque el restaurante los objete. Si un negocio quiere responder, se le abre un hilo de derecho de réplica y se publica íntegro. No se borra la crítica. Se le da lugar a la respuesta.';

export const NOT_LEAD = 'Lo que CRTQ no es:';
export const NOT_LIST: string[] = [
  'No es una lista.',
  'No es un ranking.',
  'No es un club de acceso.',
  'No es un canal de descuentos.',
  'No es una vitrina para restaurantes ni un escaparate para nadie que quiera parecer conocedor.',
];
export const NOT_CLOSER =
  'Es un registro honesto de lo que se come en esta ciudad, escrito por quienes lo pagan.';
export const CHARTER_SIGN = 'CRTQ · un proyecto de NO MAD CORNER · Monterrey, N.L.';
export const CHARTER_TAGLINE = 'Sin atajos. Sin filtros. Solo el trabajo.';
