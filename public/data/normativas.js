/* =========================================================
   NORMATIVAS DE AUREN RP — edita aquí las reglas
   - Cada categoría tiene un código (GEN, ROL…). Los números
     de cada regla (GEN-01, GEN-02…) se ponen solos según el orden.
   - "t" es el título de la regla y "d" la explicación.
   - Cambia "actualizado" cuando edites algo.
   ========================================================= */
window.AUREN_NORMATIVAS = {
  actualizado: "2026-10-20",
  categorias: [
    { id:"GEN", nombre:"Normativa general", desc:"Lo básico que aplica a todo el mundo en Auren.", reglas:[
      { t:"Respeto ante todo", d:"Prohibidos los insultos fuera de rol, el acoso, la discriminación y las amenazas, dentro y fuera del juego." },
      { t:"Edad y micrófono", d:"Para jugar necesitas un micrófono que funcione bien y cumplir la edad mínima que indique el Discord." },
      { t:"Una cuenta por persona", d:"Está prohibido usar varias cuentas o compartir la tuya. Cada jugador responde por lo que pasa en su cuenta." },
      { t:"Nombres de personaje", d:"Usa un nombre y apellido creíbles. Nada de famosos, insultos, nombres de broma o personajes de otras series." },
      { t:"Programas externos", d:"Cualquier cheat, mod menú, macro o programa que dé ventaja termina en baneo permanente." },
      { t:"Bugs y exploits", d:"Si encuentras un fallo, repórtalo por ticket. Aprovecharlo o difundirlo se sanciona." },
      { t:"Publicidad", d:"Prohibido anunciar otros servidores o comunidades dentro de Auren o en su Discord." },
      { t:"Decisiones del staff", d:"Las decisiones del staff se respetan en el momento. Si no estás de acuerdo, apela por ticket, nunca en el juego." }
    ]},
    { id:"ROL", nombre:"Conceptos de rol", desc:"Las reglas que hacen que el rol funcione.", reglas:[
      { t:"Mantener el personaje", d:"Tu personaje no sabe lo que tú sabes fuera del juego. No rompas el rol salvo emergencia real o indicación del staff." },
      { t:"Metagaming (MG)", d:"Usar información de fuera del juego (streams, Discord, llamadas) dentro del rol está prohibido." },
      { t:"Powergaming (PG)", d:"No hagas acciones imposibles en la vida real ni fuerces resultados sin dar opción al otro jugador." },
      { t:"Valorar la vida", d:"Ante un arma o una amenaza clara, tu personaje tiene miedo y actúa en consecuencia." },
      { t:"Random Deathmatch (RDM)", d:"Atacar o matar sin un rol previo y un motivo claro está prohibido." },
      { t:"Vehicle Deathmatch (VDM)", d:"Usar un vehículo como arma sin un rol que lo justifique está prohibido." },
      { t:"Combat logging", d:"Salirte del juego en medio de un rol, una persecución o una detención se sanciona." },
      { t:"Nueva vida (NLR)", d:"Si te reaniman sin recordar, olvidas lo que pasó en ese rol y no vuelves a la zona en 15 minutos." },
      { t:"Fuera de rol (OOC)", d:"Las conversaciones fuera de rol se hacen por los canales OOC, nunca hablando en voz dentro del juego." },
      { t:"Rol de entorno", d:"Si hay gente cerca, reacciona a lo que ves y oyes. Ignorar un tiroteo frente a ti rompe el rol." }
    ]},
    { id:"DEL", nombre:"Normativa delictiva", desc:"Robos, secuestros y organizaciones.", reglas:[
      { t:"Policías mínimos", d:"Cada tipo de robo necesita un número mínimo de policías en servicio. Consulta la tabla en el Discord." },
      { t:"Zonas seguras", d:"Hospital, comisarías, concesionarios y el DMV son zonas seguras. No se roba, secuestra ni dispara ahí." },
      { t:"Secuestros", d:"Necesitas un motivo de rol. Un rehén no puede ser un amigo de tu propia banda y no se le retiene más de 30 minutos." },
      { t:"Negociaciones", d:"En un robo con rehenes se negocia antes de disparar. Abrir fuego sin negociar se considera RDM." },
      { t:"Límite de integrantes", d:"En un mismo crimen participan como máximo los integrantes que permita el staff para ese tipo de rol." },
      { t:"Organizaciones", d:"Las bandas y organizaciones se registran con el staff y respetan su número máximo de miembros." },
      { t:"Venta de drogas", d:"Solo en las zonas y con los sistemas del servidor. Vender a jugadores recién llegados sin rol está prohibido." },
      { t:"Robo a jugadores", d:"No se roban objetos VIP, dinero de cuentas bancarias ni coches de trabajo." }
    ]},
    { id:"POL", nombre:"Policía y EMS", desc:"Servicios de emergencia de Auren.", reglas:[
      { t:"Uso de la fuerza", d:"La policía escala la fuerza según la amenaza. El arma letal es el último recurso." },
      { t:"Detenciones", d:"Se informan los cargos y se respeta el derecho a un abogado si lo pide." },
      { t:"Cacheos", d:"Se cachea cuando hay sospecha razonable o tras una detención. No se confisca sin rol." },
      { t:"Persecuciones", d:"Sin PIT en zonas llenas de gente. Si la persecución se alarga, el mando decide si se abandona." },
      { t:"EMS neutral", d:"Los médicos atienden a todos por igual y no participan en crímenes ni tiroteos." },
      { t:"Corrupción", d:"Un policía o médico corrupto necesita permiso previo del staff y un rol trabajado." }
    ]},
    { id:"VEH", nombre:"Vehículos y conducción", desc:"Cómo se maneja en Liberty City.", reglas:[
      { t:"Conducción realista", d:"Nada de saltos imposibles, subir montañas en deportivos o tirarte por puentes sin consecuencias." },
      { t:"Daños", d:"Si tu coche choca fuerte, rolea las heridas y el daño del vehículo." },
      { t:"Licencias", d:"Conducir sin licencia o con una licencia equivocada (por ejemplo, camión sin CDL) puede terminar en multa o detención." },
      { t:"Vehículos de trabajo", d:"Los coches de policía, EMS o empresas solo los usan sus trabajadores en servicio." },
      { t:"Desguace", d:"Robar y desguazar coches de otros jugadores solo se permite siguiendo el sistema del servidor." }
    ]},
    { id:"CK", nombre:"Muerte de personaje", desc:"Cuando un personaje se despide para siempre.", reglas:[
      { t:"Qué es un CK", d:"Un Character Kill elimina al personaje para siempre: pierde su dinero, sus bienes y sus relaciones." },
      { t:"Solicitar un CK", d:"Se pide por ticket con un motivo de rol y pruebas. Lo aprueba el staff antes de hacerse." },
      { t:"CK voluntario", d:"Puedes pedir el CK de tu propio personaje si quieres cerrar su historia." },
      { t:"Venganza", d:"Tras un CK nadie puede usar a otro personaje para vengar al que murió." }
    ]},
    { id:"VIP", nombre:"Compras VIP", desc:"Beneficios y compras por el Discord.", reglas:[
      { t:"Canal oficial", d:"Las compras VIP se hacen solo por los tickets oficiales del Discord de Auren." },
      { t:"Sin ventajas en el rol", d:"Los beneficios VIP no te protegen de las normas ni de las consecuencias de tu rol." },
      { t:"Reventa", d:"Revender, regalar o intercambiar beneficios VIP por dinero real fuera del canal oficial está prohibido." }
    ]},
    { id:"STF", nombre:"Staff y sanciones", desc:"Cómo se aplican y se apelan las sanciones.", reglas:[
      { t:"Tipos de sanción", d:"Según la falta: aviso, expulsión, baneo temporal o baneo permanente." },
      { t:"Reportes", d:"Se reporta por ticket con clip o pruebas. Sin pruebas, el staff decide con lo que vio." },
      { t:"Apelaciones", d:"Toda sanción se puede apelar una vez por ticket, con respeto y en un plazo de 7 días." },
      { t:"Abuso del staff", d:"Si un miembro del staff abusa de su cargo, repórtalo por ticket a la administración." }
    ]}
  ]
};
