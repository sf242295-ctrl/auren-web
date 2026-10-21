/* =========================================================
   NORMATIVAS DE AUREN RP — edita aquí las reglas
   - Cada categoría tiene un código (GEN, ROL…). Los números
     de cada regla (GEN-01, GEN-02…) se ponen solos según el orden.
   - "t" es el título de la regla y "d" la explicación.
   - Opcionales por categoría: "parte", "intro" (texto destacado; [[END]] = tecla,
     **texto** = negrita), "ejemplos", "subtitulo", "nota" y "tabla".
   - Cambia "actualizado" cuando edites algo.
   ========================================================= */
window.AUREN_NORMATIVAS = {
  actualizado: "2026-10-21",
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
    { id:"DEL", nombre:"Actos delictivos", parte:"Delitos · Parte 1 de 4", desc:"Lo que debes hacer antes de cualquier delito y lo que pueden hacer los civiles.",
      intro:"Antes de realizar cualquier acto delictivo, debe verificar que los delitos estén habilitados presionando la tecla [[END]] de su teclado. Todo acto delictivo requiere enviar un **entorno** al momento de iniciarlo. Los entornos deben ser lo más detallados posible y estar redactados desde el punto de vista de una **tercera persona**.",
      ejemplos:[
        { t:"Asalto a una persona", d:"+/911 Estoy viendo a un individuo vestido con camiseta negra y pantalón color crema atracando a una persona. Se desplazan en un Honda rojo con rumbo hacia el impound de la ciudad." },
        { t:"Robo a un banco", d:"+/911 Acaban de ingresar cinco personas, todas vestidas completamente de blanco, y al parecer mantienen a tres rehenes. Llegaron en motores rojos y se muestran sumamente violentos." }
      ],
      subtitulo:"Actos delictivos permitidos a los civiles",
      reglas:[
        { t:"Robos pequeños", d:"Tiendas y licorerías, así como robos realizados mediante la tablet ilegal." },
        { t:"Secuestro", d:"Secuestro con fines de robo pequeño." },
        { t:"Estafas", d:"Las estafas están permitidas a los civiles." }
      ],
      nota:"Cada civil solo podrá realizar tres robos pequeños por semana."
    },
    { id:"ROB", nombre:"Robos pequeños", parte:"Delitos · Parte 1 de 4", desc:"Reglas de los robos pequeños y de los atracos a tiendas y licorerías.",
      reglas:[
        { t:"Participantes", d:"Máximo de tres civiles participantes." },
        { t:"Policías", d:"Se requiere un mínimo de tres oficiales de policía y un máximo de cuatro." },
        { t:"Rehenes", d:"Máximo de dos rehenes." },
        { t:"Armas", d:"Únicamente se permite pistola no automática." },
        { t:"Tiradores", d:"No se permiten tiradores." },
        { t:"Vehículos", d:"Solo se permite un carro o un motor." },
        { t:"Deshuesar carros", d:"Deshuesar carros requiere un mínimo de cuatro policías disponibles y los delitos habilitados. No se puede despojar del vehículo a los jugadores; únicamente se permiten los vehículos encontrados." }
      ],
      tabla:{ titulo:"Atracos a tiendas y licorerías", filas:[
        ["Policías disponibles", "Mínimo 3 · Máximo 4"],
        ["Atracadores", "Máximo 3"],
        ["Rehenes", "Máximo 2"],
        ["Armas de la policía", "Pistola no automática"],
        ["Armas de los atracadores", "Pistola no automática"],
        ["Tiradores", "No se permiten", "no"],
        ["Vehículos de los atracadores", "Un motor o un vehículo"],
        ["Vehículos de la policía", "Dos patrullas, o un motor y un carro"],
        ["Águila (helicóptero)", "No está permitido", "no"]
      ]}
    },
    { id:"CON", nombre:"Normas de conducta delictiva", parte:"Delitos · Parte 2 de 4", desc:"Normas de conducta en roles delictivos (1 a 12).", reglas:[
      { t:"Robos a tiendas y licorerías", d:"Solo podrán realizarse utilizando pistolas semiautomáticas. No se permiten armas automáticas ni armas largas." },
      { t:"Uso de emotes", d:"Queda prohibido utilizar emotes con la finalidad de obtener ventaja en cualquier terreno o situación de rol." },
      { t:"Regreso a zonas de rol agresivo", d:"Una vez que una persona abandone una zona donde se esté desarrollando un rol agresivo, no podrá regresar a dicha zona." },
      { t:"Abatidos en roles agresivos", d:"Si es abatido durante un rol agresivo, no podrá presionar la tecla E hasta que hayan transcurrido veinte minutos, siempre y cuando el rol continúe en curso. Podrá regresar al rol únicamente si alguien le informa IC que la situación continúa. Al regresar, deberá respetar nuevamente el entorno del rol; por ejemplo, no podrá llegar disparando desde lejos ni ingresar repentinamente en medio del tiroteo. Además, deberá contar con pruebas en video de que alguien le informó IC que el rol continuaba. Esto se establece con el fin de evitar situaciones de metagaming." },
      { t:"Emote de brazos cruzados", d:"Queda prohibido utilizar el emote de cruzar los brazos para ocultar que se posee un arma, sin importar si se trata de una pistola u otro tipo de arma." },
      { t:"Matar NPC", d:"Queda prohibido matar NPC sin justificación, ya que estos actúan como cualquier jugador dentro del roleplay." },
      { t:"Disparos desde vehículos", d:"Queda prohibido disparar siendo conductor. Asimismo, no se deberá disparar contra una persona que se encuentre montada en un vehículo." },
      { t:"Delitos sin policías disponibles", d:"No se podrá realizar ningún tipo de delito si no hay policías disponibles." },
      { t:"Atracos durante el día", d:"No se podrán realizar atracos durante el día." },
      { t:"Robo de vehículos a NPC", d:"Cuando no haya policías disponibles, queda prohibido matar a un NPC con el único fin de despojarlo de su vehículo. El vehículo podrá obtenerse mediante rol, por ejemplo, amenazando al NPC para que entregue las llaves." },
      { t:"Cascos protectores", d:"Queda prohibido el uso de cascos protectores en roles agresivos." },
      { t:"Robar o cachear personas abatidas", d:"Queda prohibido robar o cachear a personas que sean encontradas muertas o abatidas en la vía pública." }
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
