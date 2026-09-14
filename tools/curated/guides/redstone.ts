/**
 * Гайды по базовым редстоун-механикам.
 *
 * Схемы показывают именно узел: провод, который надо повторить, а не декорацию
 * вокруг него. Слои идут снизу вверх, сетка — вид сверху.
 *
 * Два правила, на которых держится вся эта папка:
 *
 *  1. `^сторона` значит «блок смотрит туда», то есть для повторителя и
 *     компаратора — «сигнал уходит туда». Соглашение игры для этих двух
 *     блоков обратное, и перевод делается в `gameFacing`, а не здесь.
 *  2. Пыль, повторители, факелы, рычаги и кнопки не висят в воздухе: под ними
 *     всегда есть слой опоры, и он входит в список материалов.
 */
import { _, type Guide } from './types.ts'

export const REDSTONE_GUIDES: Guide[] = [
  {
    id: 'piston_door',
    category: 'redstone',
    ru: 'Дверь на поршнях',
    en: 'Piston Door',
    icon: 'sticky_piston',
    editions: ['java', 'bedrock'],
    ruSummary: 'Четыре липких поршня выдвигают блоки полотна в проём 2×2 и втягивают их обратно.',
    enSummary: 'Four sticky pistons push door blocks into a 2×2 opening and pull them back out.',
    materials: [
      { id: 'sticky_piston', count: 4 },
      { id: 'polished_andesite', count: 4 },
      { id: 'stone', count: 32 },
      { id: 'redstone', count: 15 },
      { id: 'lever', count: 1 },
    ],
    schematics: [
      {
        ru: 'Проём 2×2',
        en: '2×2 doorway',
        steps: [
          {
            ru: 'Выложите основание 8×3 и заднюю полку: на ней пройдёт верхний провод.',
            en: 'Lay an 8×3 foundation and a rear shelf for the upper wire.',
          },
          {
            ru: 'Поставьте по липкому поршню с каждой стороны и по блоку полотна перед ними; две клетки в центре оставьте проходом.',
            en: 'Put a sticky piston on each side and a door block in front of each; leave the two centre tiles as the passage.',
          },
          {
            ru: 'Спереди проведите нижнюю линию от рычага; в правом углу поднимите пыль на заднюю полку.',
            en: 'Run the lower line from the lever along the front and step the dust onto the rear shelf at the right.',
          },
          {
            ru: 'Повторите поршни и блоки полотна этажом выше, затем проведите по полке линию вдоль верхнего ряда.',
            en: 'Repeat the pistons and door blocks one level higher, then run the shelf line along the upper row.',
          },
        ],
        layers: [
          {
            grid: [
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
            ],
          },
          {
            grid: [
              ['lever@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3'],
              [_, 'sticky_piston^east', 'polished_andesite', _, _, 'polished_andesite', 'sticky_piston^west', 'redstone@3'],
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
            ],
          },
          {
            grid: [
              [_, _, _, _, _, _, _, _],
              [_, 'sticky_piston^east@4', 'polished_andesite@4', _, _, 'polished_andesite@4', 'sticky_piston^west@4', _],
              [_, 'redstone@4', 'redstone@4', 'redstone@4', 'redstone@4', 'redstone@4', 'redstone@4', 'redstone@4'],
            ],
          },
        ],
        animation: { duration: 28, events: [
          { tick: 4, type: 'press', x: 0, y: 1, z: 0 },
          { tick: 16, type: 'press', x: 0, y: 1, z: 0 },
        ] },
      },
    ],
    ruNotes: [
      'В покое проём открыт: четыре блока полотна стоят перед втянутыми поршнями по бокам. При питании поршни сдвигают их на одну клетку к центру и закрывают проём 2×2.',
      'Липкость здесь обязательна: обычный поршень закрыл бы дверь, но после выключения оставил бы блок полотна в проходе. Липкий поршень втягивает его обратно.',
      'Оба ряда показаны в схеме; верхняя линия поднимается ступенькой на заднюю каменную полку.',
      'Рычаг во включённом положении держит дверь закрытой. Чтобы он наоборот открывал её, поставьте между ним и проводом инвертор из блока с факелом — см. «Логические вентили».',
    ],
    enNotes: [
      'At rest the opening is clear: four door blocks sit in front of the retracted pistons at the sides. Power moves them one tile towards the centre and closes the 2×2 opening.',
      'Stickiness is essential here: a normal piston could close the door but would leave its door block in the passage after power is removed. A sticky piston pulls it back.',
      'The upper row is one block higher and is powered by the same wire stepped onto the rear stone shelf.',
      'With the lever on, the door stays shut. To make the lever open it instead, put a block-and-torch inverter between lever and wire — see “Logic Gates”.',
    ],
  },

  {
    id: 'repeater_clock',
    category: 'redstone',
    ru: 'Тактовый генератор на повторителях',
    en: 'Repeater Clock',
    icon: 'repeater',
    editions: ['java', 'bedrock'],
    ruSummary: 'Кольцо из повторителей гоняет сигнал по кругу. Период задаётся их количеством.',
    enSummary: 'A ring of repeaters sends the signal round and round. The period is their count.',
    materials: [
      { id: 'stone', count: 16 },
      { id: 'repeater', count: 4 },
      { id: 'redstone', count: 8 },
      { id: 'stone_button', count: 1 },
    ],
    schematics: [
      {
        ru: 'Кольцо',
        en: 'The loop',
        steps: [
          {
            ru: 'Площадка 4×4 из камня — основание кольца.',
            en: 'A 4×4 stone platform — the base of the ring.',
          },
          {
            ru: 'По одному повторителю на каждой стороне, все по кругу в одну сторону.',
            en: 'One repeater on each side, all pointing the same way around the loop.',
          },
          {
            ru: 'Замкните круг проводом: углы — только пыль, повторитель на повороте не работает.',
            en: 'Close the ring with wire: corners are dust only, a repeater cannot turn.',
          },
          {
            ru: 'Кнопка внутри кольца, вплотную к проводу: одно нажатие запускает такт навсегда.',
            en: 'A button inside the ring, touching the wire: one press starts the clock for good.',
          },
        ],
        layers: [
          {
            grid: [
              ['stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone'],
            ],
          },
          {
            grid: [
              ['redstone@3', { block: 'repeater', facing: 'east', variant: 'delay_4' }, 'redstone@3', 'redstone@3'],
              ['redstone@3', 'stone_button@4', _, { block: 'repeater', facing: 'south', variant: 'delay_4' }],
              [{ block: 'repeater', facing: 'north', variant: 'delay_4' }, _, _, 'redstone@3'],
              ['redstone@3', 'redstone@3', { block: 'repeater', facing: 'west', variant: 'delay_4' }, 'redstone@3'],
            ],
          },
        ],
        animation: { duration: 40, loop: true, events: [{ tick: 2, type: 'press', x: 1, y: 1, z: 1 }] },
      },
    ],
    ruNotes: [
      'Каждый повторитель добавляет от 1 до 4 тиков задержки — период настраивается щелчком по нему.',
      'Меньше двух повторителей кольцо не держит: сигнал гаснет.',
      'Рычаг тут не годится: включённый навсегда, он залил бы всё кольцо ровным сигналом. Нужен именно импульс.',
    ],
    enNotes: [
      'Each repeater adds 1 to 4 ticks — right-click to tune the period.',
      'Fewer than two repeaters and the loop dies out.',
      'A lever will not do: left on, it would flood the ring with a steady signal. What you need is a pulse.',
    ],
  },

  {
    id: 'observer_clock',
    category: 'redstone',
    ru: 'Тактовый генератор на наблюдателях',
    en: 'Observer Clock',
    icon: 'observer',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Два наблюдателя смотрят друг на друга и бесконечно спорят. Самый быстрый и самый компактный такт.',
    enSummary:
      'Two observers stare at each other and argue forever. The fastest and smallest clock there is.',
    materials: [{ id: 'observer', count: 2 }],
    schematics: [
      {
        ru: 'Два блока',
        en: 'Two blocks',
        steps: [
          { ru: 'Поставьте наблюдатель.', en: 'Place an observer.' },
          {
            ru: 'Второй — лицом к лицу с первым. Такт запускается сам.',
            en: 'The second one face to face with the first. It starts on its own.',
          },
        ],
        layers: [{ grid: [['observer^east', 'observer^west@2']] }],
        animation: { duration: 24, loop: true, events: [] },
      },
    ],
    ruNotes: [
      'Период — 2 игровых тика, это очень быстро: воронки и раздатчики за ним не успевают.',
      'Чтобы остановить, сломайте любой из двух.',
    ],
    enNotes: [
      'The period is 2 game ticks, which is very fast: hoppers and dispensers cannot keep up.',
      'Break either one to stop it.',
    ],
  },

  {
    id: 'hopper_timer',
    category: 'redstone',
    ru: 'Воронковый таймер',
    en: 'Hopper Timer',
    icon: 'hopper',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Воронка сливает стопку в сундук, компаратор гаснет, когда она опустела. Так отмеряют минуты, а не тики.',
    enSummary:
      'A hopper drains a stack into a chest and the comparator goes dark when it is empty. This measures minutes, not ticks.',
    materials: [
      { id: 'stone', count: 26 },
      { id: 'hopper', count: 4 },
      { id: 'chest', count: 1 },
      { id: 'comparator', count: 3 },
      { id: 'redstone', count: 7 },
      { id: 'redstone_lamp', count: 1 },
      { id: 'sticky_piston', count: 2 },
      { id: 'redstone_block', count: 1 },
    ],
    schematics: [
      {
        ru: 'Отсчёт',
        en: 'The countdown',
        steps: [
          { ru: 'Каменная площадка под компаратор и провод.', en: 'A stone platform for the comparator and wire.' },
          {
            ru: 'Воронка, направленная в сундук. В неё и засыпают предметы — их количество и есть время.',
            en: 'A hopper pointing into a chest. The items you put in are the time you are measuring.',
          },
          {
            ru: 'Сзади воронки — компаратор, от него провод к лампе. Лампа горит, пока в воронке что-то есть.',
            en: 'A comparator behind the hopper, then wire to a lamp. The lamp burns while the hopper holds anything.',
          },
        ],
        layers: [
          { grid: [['stone', 'stone', 'stone', 'stone', 'stone']] },
          {
            grid: [
              [
                'redstone_lamp@3',
                'redstone@3',
                'comparator^west@3',
                'hopper^east@2',
                'chest@2',
              ],
            ],
          },
        ],
        animation: { duration: 32, events: [
          { tick: 1, type: 'container', x: 3, y: 1, z: 0, signal: 15 },
          { tick: 28, type: 'container', x: 3, y: 1, z: 0, signal: 0 },
        ] },
      },
      {
        ru: 'Повторяющийся двухворонковый таймер',
        en: 'Repeating dual-hopper timer',
        steps: [
          { ru: 'Поставьте основание 7×3.', en: 'Lay a 7×3 foundation.' },
          { ru: 'Две воронки направьте друг в друга, снаружи поставьте компараторы.', en: 'Point two hoppers into each other and put comparators on their outer sides.' },
          { ru: 'Проведите выходы компараторов к липким поршням по обеим сторонам.', en: 'Wire the comparator outputs to sticky pistons on both sides.' },
          { ru: 'Между поршнями поставьте блок редстоуна: он попеременно запирает принимающую воронку.', en: 'Place a redstone block between the pistons so it alternately locks the receiving hopper.' },
        ],
        layers: [
          { grid: [
            ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
            ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
            ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
          ] },
          { grid: [
            [_, 'redstone@3', 'redstone@3', _, 'redstone@3', 'redstone@3', _],
            ['sticky_piston^east@3', 'comparator^west', 'hopper^east', 'hopper^west', 'comparator^east', 'sticky_piston^west@3', _],
          ] },
          { grid: [[_, _, _, 'redstone_block@4', _, _, _]] },
        ],
        animation: { duration: 48, loop: true, events: [
          { tick: 1, type: 'container', x: 2, y: 1, z: 1, signal: 15 },
          { tick: 22, type: 'container', x: 2, y: 1, z: 1, signal: 0 },
          { tick: 22, type: 'container', x: 3, y: 1, z: 1, signal: 15 },
          { tick: 44, type: 'container', x: 3, y: 1, z: 1, signal: 0 },
        ] },
      },
    ],
    ruNotes: [
      'Воронка отдаёт 2,5 предмета в секунду. Стопка в 64 — это 25 секунд, пять полных стопок — больше двух минут.',
      'Компаратор сзади читает не «есть или нет», а насколько воронка полна: сигнал падает по мере опустошения.',
      'Первая схема — одноразовый отсчёт; вторая полностью показывает повторяющийся таймер с взаимной блокировкой.',
    ],
    enNotes: [
      'A hopper moves 2.5 items per second. A stack of 64 is 25 seconds; five full stacks are over two minutes.',
      'The comparator behind it reads not “empty or not” but how full the hopper is: the signal falls as it drains.',
      'This is a one-shot timer. Making it repeat means locking the hoppers against each other, which is a notably bigger circuit — that is what a hopper clock is.',
    ],
  },

  {
    id: 't_flip_flop',
    category: 'redstone',
    ru: 'T-триггер',
    en: 'T Flip-Flop',
    icon: 'copper_bulb',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Превращает нажатие кнопки в переключатель: нажал — включилось, нажал ещё — выключилось.',
    enSummary: 'Turns a button press into a switch: press once for on, press again for off.',
    materials: [
      { id: 'stone', count: 4 },
      { id: 'stone_button', count: 1 },
      { id: 'redstone', count: 1 },
      { id: 'copper_bulb', count: 1 },
      { id: 'comparator', count: 1 },
      { id: 'redstone_lamp', count: 1 },
    ],
    schematics: [
      {
        ru: 'На медной лампе',
        en: 'Copper bulb version',
        steps: [
          { ru: 'Каменная площадка под кнопку и провод.', en: 'A stone platform for the button and wire.' },
          {
            ru: 'Кнопка и провод от неё к медной лампе.',
            en: 'The button, with wire running from it to the copper bulb.',
          },
          {
            ru: 'Компаратор читает лампу сзади и отдаёт её состояние дальше — это и есть выход.',
            en: 'The comparator reads the bulb from behind and passes its state on — that is the output.',
          },
        ],
        layers: [
          { grid: [['stone', 'stone', 'stone', 'stone']] },
          {
            grid: [
              ['stone_button', 'redstone', 'copper_bulb', 'comparator^east@3', 'redstone_lamp@3'],
            ],
          },
        ],
      },
    ],
    ruNotes: [
      'Медная лампа переключается от каждого импульса и помнит состояние — это готовый T-триггер в одном блоке.',
      'Считывать её состояние нужно компаратором: обычный провод рядом с лампой ничего не покажет.',
      'До медных ламп то же самое собирали из липкого поршня, блока редстоуна и наблюдателя — раз в пять больше блоков.',
    ],
    enNotes: [
      'A copper bulb toggles on every pulse and remembers its state — a one-block T flip-flop.',
      'Read it with a comparator: plain wire beside the bulb shows nothing.',
      'Before copper bulbs the same job took a sticky piston, a redstone block and an observer — about five times the blocks.',
    ],
  },

  {
    id: 'rs_latch',
    category: 'redstone',
    ru: 'RS-фиксатор',
    en: 'RS Latch',
    icon: 'redstone_torch',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Два входа: один включает, другой выключает. Схема помнит, что было последним.',
    enSummary: 'Two inputs: one sets, the other resets. The circuit remembers which came last.',
    materials: [
      { id: 'stone', count: 45 },
      { id: 'redstone_torch', count: 2 },
      { id: 'redstone', count: 18 },
      { id: 'repeater', count: 2 },
      { id: 'lever', count: 2 },
    ],
    schematics: [
      {
        ru: 'Классический вид',
        en: 'Classic layout',
        steps: [
          {
            ru: 'Сделайте основание 9×5 под две разнесённые перекрёстные дорожки.',
            en: 'Build a 9×5 base for two separated cross-coupled paths.',
          },
          {
            ru: 'Два блока, на внешние грани каждого — по факелу. Это и есть память схемы.',
            en: 'Two blocks with a torch on the outer face of each. That is the memory.',
          },
          {
            ru: 'От каждого факела ведите отдельную дорожку через повторитель к чужому блоку: повторители не дают входу питать цепь назад.',
            en: 'Run each torch through a repeater to the other block; the repeaters prevent an input from back-powering the path.',
          },
          {
            ru: 'Рычаги поставьте сверху на блоки: каждый выбирает противоположное сохранённое состояние.',
            en: 'Put a lever on each block: each one selects the opposite stored state.',
          },
        ],
        layers: [
          {
            grid: [
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
            ],
          },
          {
            grid: [
              ['redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', _],
              [{ block: 'repeater', facing: 'north', step: 3 }, _, _, _, _, _, _, { block: 'redstone', variant: 's', step: 3 }, _],
              [{ block: 'redstone_torch', facing: 'west', active: false }, 'stone', _, _, _, _, _, 'stone', { block: 'redstone_torch', facing: 'east' }],
              [_, { block: 'redstone', variant: 'n', step: 3 }, _, _, _, _, _, _, { block: 'repeater', facing: 'south', step: 3 }],
              [_, 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'redstone@3'],
            ],
          },
          {
            grid: [
              [_, _, _, _, _, _, _, _, _],
              [_, _, _, _, _, _, _, _, _],
              [_, 'lever@4', _, _, _, _, _, 'lever@4', _],
            ],
          },
        ],
      },
    ],
    ruNotes: [
      'Факел горит, пока его опорный блок не запитан. Повторители работают как диоды: сигнал памяти идёт только к противоположному блоку.',
      'Если подать сигнал на оба входа сразу, состояние непредсказуемо — так у всех RS-фиксаторов.',
      'Повторитель, заблокированный сбоку, делает то же самое компактнее: два таких дают фиксатор из двух блоков.',
    ],
    enNotes: [
      'A torch burns while its support block is unpowered. The repeaters act as diodes, carrying stored state only toward the opposite block.',
      'Signalling both inputs at once leaves the state undefined — that is true of every RS latch.',
      'A repeater locked from the side does the same job smaller: two of them make a two-block latch.',
    ],
  },

  {
    id: 'logic_gates',
    category: 'redstone',
    ru: 'Логические вентили',
    en: 'Logic Gates',
    icon: 'redstone_torch',
    editions: ['java', 'bedrock'],
    ruSummary:
      'НЕ, ИЛИ, И и вычитание на компараторе — четыре кирпича, из которых собрано всё остальное.',
    enSummary:
      'NOT, OR, AND and comparator subtraction — the four bricks everything else is built from.',
    materials: [
      { id: 'stone', count: 24 },
      { id: 'redstone_torch', count: 4 },
      { id: 'redstone', count: 16 },
      { id: 'comparator', count: 1 },
      { id: 'lever', count: 5 },
      { id: 'redstone_lamp', count: 4 },
    ],
    schematics: [
      {
        ru: 'НЕ: факел на блоке',
        en: 'NOT: a torch on a block',
        steps: [
          {
            ru: 'Пол под рычаг, провод и выход. Под факелом пола нет: он висит на блоке.',
            en: 'Floor for the lever, the wire and the output. None under the torch: it hangs on the block.',
          },
          {
            ru: 'Рычаг, провод, глухой блок и факел на его дальней грани.',
            en: 'Lever, wire, a solid block, and a torch on its far face.',
          },
          {
            ru: 'От факела — провод к лампе. Рычаг включён — лампа гаснет.',
            en: 'Wire from the torch to the lamp. Lever on, lamp off.',
          },
        ],
        layers: [
          { grid: [['stone', 'stone', 'stone', 'stone', 'stone', 'stone']] },
          {
            grid: [
              ['lever', { block: 'redstone', variant: 'e' }, 'stone', 'redstone_torch', 'redstone@3', 'redstone_lamp@3'],
            ],
          },
        ],
      },
      {
        ru: 'ИЛИ: два провода в один',
        en: 'OR: two wires into one',
        steps: [
          { ru: 'Пол под всю схему.', en: 'Floor under the whole thing.' },
          {
            ru: 'Два рычага, и провод от каждого сходится в общую линию к лампе.',
            en: 'Two levers, and wire from each merging into one line to the lamp.',
          },
        ],
        layers: [
          {
            grid: [
              ['stone', 'stone', _, _],
              [_, 'stone', 'stone', _],
              ['stone', 'stone', _, _],
            ],
          },
          {
            grid: [
              ['lever', 'redstone', _, _],
              [_, 'redstone', 'redstone', 'redstone_lamp'],
              ['lever', 'redstone', _, _],
            ],
          },
        ],
      },
      {
        ru: 'И: два инвертора и третий факел',
        en: 'AND: two inverters and a third torch',
        steps: [
          {
            ru: 'Пол под рычаги, провода и общую линию.',
            en: 'Floor under the levers, the wires and the shared line.',
          },
          {
            ru: 'Два одинаковых инвертора: рычаг, провод, блок, факел.',
            en: 'Two identical inverters: lever, wire, block, torch.',
          },
          {
            ru: 'Оба факела сводятся на один блок, и факел на нём даёт выход: горит, только когда оба рычага включены.',
            en: 'Both torches feed one block, and the torch on it is the output: lit only when both levers are on.',
          },
        ],
        layers: [
          {
            grid: [
              ['stone', 'stone', 'stone', 'stone', _, _, _],
              [_, _, _, 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', _, _, _],
            ],
          },
          {
            grid: [
              ['lever', { block: 'redstone', variant: 'e' }, 'stone', 'redstone_torch', _, _, _],
              [_, _, _, { block: 'redstone', variant: 'e', step: 3 }, 'stone@3', { block: 'redstone_torch', facing: 'east', step: 3 }, 'redstone_lamp@3'],
              ['lever', { block: 'redstone', variant: 'e' }, 'stone', 'redstone_torch', _, _, _],
            ],
          },
        ],
      },
      {
        ru: 'Вычитание на компараторе',
        en: 'Comparator subtraction',
        steps: [
          { ru: 'Пол под рычаги, компаратор и провод.', en: 'Floor under the levers, comparator and wire.' },
          {
            ru: 'Главный вход сзади компаратора: рычаг и провод к его задней стороне.',
            en: 'The main input goes into the comparator’s back: a lever and wire behind it.',
          },
          {
            ru: 'Второй рычаг подводится сбоку. Щёлкните по компаратору — задняя лампочка загорится, это режим вычитания: боковой сигнал теперь запирает главный.',
            en: 'The second lever comes in from the side. Click the comparator — its rear lamp lights, that is subtract mode: the side input now blocks the main one.',
          },
        ],
        layers: [
          {
            grid: [
              ['stone', 'stone', 'stone', 'stone', _],
              [_, _, 'stone', _, _],
              [_, _, 'stone', _, _],
            ],
          },
          {
            grid: [
              ['lever', 'redstone', { block: 'comparator', facing: 'east', variant: 'subtract' }, 'redstone@3', 'redstone_lamp@3'],
              [_, _, 'redstone@3', _, _],
              [_, _, 'lever@3', _, _],
            ],
          },
        ],
      },
    ],
    ruNotes: [
      'У компаратора два входа: сзади — главный, сбоку — тот, что вычитается. Второй щелчок включает режим вычитания, задняя лампочка загорается.',
      'Исключающее ИЛИ собирают из этих же кирпичей: «одно из двух, но не оба» — это ИЛИ и НЕ-И, сведённые вентилем И.',
      'Провод передаёт сигнал на 15 блоков, дальше нужен повторитель.',
    ],
    enNotes: [
      'A comparator has two inputs: the back is the main one, the side is subtracted. A second click switches to subtract mode and lights the rear lamp.',
      'XOR is built from these same bricks: “one or the other but not both” is an OR and a NAND fed into an AND.',
      'Wire carries 15 blocks; past that you need a repeater.',
    ],
  },

  {
    id: 'pulse_extender',
    category: 'redstone',
    ru: 'Удлинитель импульса',
    en: 'Pulse Extender',
    icon: 'repeater',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Кнопка даёт короткий импульс, а дверь должна постоять открытой. Цепочка повторителей растягивает сигнал.',
    enSummary:
      'A button gives a short pulse, but the door should stay open. A repeater chain stretches it.',
    materials: [
      { id: 'stone', count: 12 },
      { id: 'stone_button', count: 1 },
      { id: 'redstone', count: 8 },
      { id: 'repeater', count: 2 },
      { id: 'redstone_lamp', count: 1 },
    ],
    schematics: [
      {
        ru: 'Две ветки',
        en: 'Two branches',
        steps: [
          { ru: 'Пол под обе ветки.', en: 'Floor under both branches.' },
          {
            ru: 'Кнопка и прямая ветка провода к лампе — она включает лампу сразу.',
            en: 'The button and the straight wire branch to the lamp — it lights the lamp at once.',
          },
          {
            ru: 'Вторая ветка от той же кнопки — через цепочку повторителей. Она приходит позже и держит лампу дальше.',
            en: 'The second branch from the same button runs through a repeater chain. It arrives later and holds the lamp on.',
          },
        ],
        layers: [
          {
            grid: [
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
            ],
          },
          {
            grid: [
              ['stone_button', 'redstone', 'redstone', 'redstone', 'redstone', 'redstone_lamp'],
              [
                'redstone@3',
                { block: 'repeater', facing: 'east', variant: 'delay_4', step: 3 },
                { block: 'repeater', facing: 'east', variant: 'delay_4', step: 3 },
                'redstone@3',
                'redstone@3',
                'redstone@3',
              ],
            ],
          },
        ],
        animation: { duration: 26, events: [{ tick: 2, type: 'press', x: 0, y: 1, z: 0 }] },
      },
    ],
    ruNotes: [
      'Оба повторителя выставлены на максимум: задержанная ветвь приходит через 8 редстоун-тиков и перекрывается с импульсом каменной кнопки. Выход непрерывно активен около 1,8 секунды.',
      'Задержка настраивается щелчком по повторителю: от одного тика до четырёх.',
      'Для задержек в минуты берите воронковый таймер: повторителей понадобилось бы несколько сотен.',
    ],
    enNotes: [
      'Both repeaters are at maximum: the delayed branch arrives after 8 redstone ticks and overlaps the stone-button pulse. The output stays continuously active for about 1.8 seconds.',
      'Right-click a repeater to set its delay, from one tick to four.',
      'For delays of minutes use a hopper timer: repeaters would run into the hundreds.',
    ],
  },

  {
    id: 'hidden_entrance',
    category: 'redstone',
    ru: 'Потайной вход',
    en: 'Hidden Entrance',
    icon: 'sticky_piston',
    editions: ['java', 'bedrock'],
    ruSummary: 'Поршень задвигает блок пола над шахтой. Снаружи ничего не видно.',
    enSummary: 'A piston slides a floor block over the shaft. Nothing shows from outside.',
    materials: [
      { id: 'sticky_piston', count: 1 },
      { id: 'stone', count: 8 },
      { id: 'redstone', count: 2 },
      { id: 'lever', count: 1 },
      { id: 'ladder', count: 8 },
    ],
    schematics: [
      {
        ru: 'Разрез',
        en: 'Cross-section',
        steps: [
          {
            ru: 'Шахта вниз: лестница на стене и пол для провода рядом.',
            en: 'The shaft: a ladder on the wall, and floor for the wire beside it.',
          },
          {
            ru: 'Липкий поршень и блок пола перед ним. Справа от блока — вход в шахту.',
            en: 'The sticky piston with a floor block in front of it. The shaft opening is to the right of that block.',
          },
          {
            ru: 'Сзади — провод к поршню и рычаг. Включён — блок задвинут, вход закрыт.',
            en: 'Behind, wire to the piston and a lever. On means the block is out and the entrance is shut.',
          },
        ],
        layers: [
          {
            grid: [
              [_, _, 'ladder', 'stone'],
              ['stone', 'stone', 'stone', _],
            ],
          },
          {
            grid: [
              ['sticky_piston^east', 'stone', _, 'stone'],
              ['redstone@3', 'redstone@3', 'lever@3', _],
            ],
          },
        ],
      },
    ],
    ruNotes: [
      'Пока рычаг включён, поршень выдвинут и блок пола стоит над шахтой. Выключили — блок вернулся, вход открыт.',
      'Липкий поршень не тянет за собой сундук, воронку и другие блоки с содержимым — пол делайте из простых блоков.',
      'Провод под полом должен быть закрыт, иначе его видно в щели.',
    ],
    enNotes: [
      'While the lever is on, the piston is extended and the floor block sits over the shaft. Switch it off and the block comes back, opening the way.',
      'Sticky pistons cannot pull chests, hoppers or other container blocks — keep the floor plain.',
      'Cover the wire under the floor or it shows through the seam.',
    ],
  },

  {
    id: 'item_filter',
    category: 'redstone',
    ru: 'Фильтр предметов',
    en: 'Item Filter',
    icon: 'hopper',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Воронка с образцом принимает только свой предмет, остальное едет дальше по линии.',
    enSummary:
      'A hopper primed with a sample accepts only its own item; everything else rides on down the line.',
    materials: [
      { id: 'hopper', count: 3 },
      { id: 'chest', count: 1 },
      { id: 'comparator', count: 1 },
      { id: 'redstone', count: 3 },
      { id: 'stone', count: 25 },
      { id: 'repeater', count: 1 },
      { id: 'redstone_torch', count: 1 },
    ],
    schematics: [
      {
        ru: 'Один модуль',
        en: 'One module',
        steps: [
          {
            ru: 'Сделайте основание под весь модуль.',
            en: 'Build the foundation for the complete module.',
          },
          {
            ru: 'Нижнюю воронку направьте в сундук; факел сбоку держит её запертой.',
            en: 'Point the lower hopper into the chest; a side torch keeps it locked.',
          },
          {
            ru: 'Над ней поставьте фильтрующую воронку боком и заполните слоты 41 + 1 + 1 + 1 + 1.',
            en: 'Above it put the filter hopper sideways and fill its slots 41 + 1 + 1 + 1 + 1.',
          },
          {
            ru: 'Сверху идёт транспортная воронка, которая передаёт поток дальше по линии.',
            en: 'The transport hopper above carries the incoming stream onward.',
          },
          {
            ru: 'Компаратор, три пыли и повторитель гасят факел только при появлении 42-го нужного предмета.',
            en: 'A comparator, three dust and a repeater turn the torch off only when the 42nd matching item arrives.',
          },
        ],
        layers: [
          { grid: [
            ['stone', 'stone', 'stone', 'stone', 'stone'],
            ['stone', 'stone', 'stone', 'stone', 'stone'],
            ['stone', 'stone', 'stone', 'stone', 'stone'],
            ['stone', 'stone', 'stone', 'stone', 'stone'],
          ] },
          { grid: [
            [_, _, _, 'stone@3', _],
            [_, 'stone', { block: 'redstone_torch', facing: 'east' }, 'hopper^east', 'chest'],
            [_, { block: 'repeater', facing: 'north', step: 5 }, 'stone@5', 'stone@5', _],
            [_, 'redstone@5', 'redstone@5', 'stone@5', _],
          ] },
          { grid: [
            [_, _, _, 'stone@3', _],
            [_, _, _, 'hopper^north@3', _],
            [_, _, _, 'comparator^south@5', _],
            [_, _, _, 'redstone@5', _],
          ] },
          { grid: [
            [_, _, _, _, _],
            [_, _, _, 'hopper^east@4', 'hopper^east@4'],
          ] },
        ],
        animation: { duration: 30, events: [
          { tick: 4, type: 'container', x: 3, y: 2, z: 1, signal: 2 },
          { tick: 12, type: 'container', x: 3, y: 2, z: 1, signal: 3 },
          { tick: 22, type: 'container', x: 3, y: 2, z: 1, signal: 2 },
        ] },
      },
    ],
    ruNotes: [
      'Фильтруемый предмет кладут в первый слот числом 41, а в остальные четыре — по одному переименованному балластному предмету: 41 + 1 + 1 + 1 + 1.',
      'Факел запирает нижнюю воронку при уровне 2; 42-й предмет повышает сигнал до 3, повторитель гасит факел и пропускает ровно лишнее.',
      'Один модуль на один вид предмета. Модули ставят вплотную друг к другу.',
    ],
    enNotes: [
      'Put 41 filter items in the first slot and one renamed filler item in each remaining slot: 41 + 1 + 1 + 1 + 1.',
      'The torch locks the lower hopper at signal 2; the 42nd matching item raises it to 3, the repeater kills the torch and exactly the surplus passes.',
      'One module per item type. Modules sit flush against each other.',
    ],
  },

  {
    id: 'combination_lock',
    category: 'redstone',
    ru: 'Кодовый замок',
    en: 'Combination Lock',
    icon: 'lever',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Дверь открывается только при верном наборе рычагов: один должен быть включён, другой выключен.',
    enSummary: 'The door opens only on the right lever pattern: one on, the other off.',
    materials: [
      { id: 'stone', count: 12 },
      { id: 'lever', count: 2 },
      { id: 'redstone', count: 6 },
      { id: 'redstone_torch', count: 2 },
      { id: 'iron_door', count: 1 },
    ],
    schematics: [
      {
        ru: 'Проверка двух рычагов',
        en: 'Two-lever check',
        steps: [
          {
            ru: 'Пол под обе ветки и под дверь.',
            en: 'Floor under both branches and under the door.',
          },
          {
            ru: 'Верхняя ветка — через инвертор: этот рычаг должен быть выключен.',
            en: 'The upper branch goes through an inverter: that lever must stay off.',
          },
          {
            ru: 'Нижняя ветка — напрямую: этот рычаг должен быть включён.',
            en: 'The lower branch goes straight through: that lever must be on.',
          },
          {
            ru: 'Обе ветки сходятся на блоке, факел на нём открывает железную дверь.',
            en: 'Both branches meet on a block, and the torch on it opens the iron door.',
          },
        ],
        layers: [
          {
            grid: [
              ['stone', 'stone', 'stone', 'stone', _, _, _],
              [_, _, _, 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', _, _, _],
            ],
          },
          {
            grid: [
              ['lever', 'redstone', 'stone', 'redstone_torch@2', _, _, _],
              [_, _, _, 'redstone@4', 'stone@4', 'redstone_torch@4', { block: 'iron_door', facing: 'east', variant: 'half=lower', step: 4 }],
              ['lever@3', 'redstone@3', 'redstone@3', 'redstone@3', _, _, _],
            ],
          },
          { grid: [[_, _, _, _, _, _, _], [_, _, _, _, _, _, { block: 'iron_door', facing: 'east', variant: 'half=upper', step: 4 }]] },
        ],
        animation: { duration: 40, events: [
          { tick: 4, type: 'press', x: 0, y: 1, z: 0 },
          { tick: 12, type: 'press', x: 0, y: 1, z: 2 },
          { tick: 22, type: 'press', x: 0, y: 1, z: 0 },
          { tick: 30, type: 'press', x: 0, y: 1, z: 2 },
        ] },
      },
    ],
    ruNotes: [
      'Инвертор на «выключенном» рычаге и есть весь секрет: без него код читается по проводу снаружи.',
      'Рычагов может быть сколько угодно: каждый добавляет свою ветку в общую линию, и «выключенные» идут через инвертор.',
      'Железная дверь не открывается рукой — это важно, деревянную можно просто толкнуть.',
    ],
    enNotes: [
      'The inverter on the “off” lever is the whole trick: without it the code is readable from the wiring outside.',
      'Any number of levers works: each adds its branch to the shared line, and the “off” ones go through an inverter.',
      'An iron door cannot be opened by hand — that matters, a wooden one just swings open.',
    ],
  },

  {
    id: 'daylight_lighting',
    category: 'redstone',
    ru: 'Автоматическое освещение',
    en: 'Automatic Lighting',
    icon: 'daylight_detector',
    editions: ['java', 'bedrock'],
    ruSummary: 'Датчик дня в режиме инверсии включает лампы на закате и гасит на рассвете.',
    enSummary: 'An inverted daylight detector turns lamps on at dusk and off at dawn.',
    materials: [
      { id: 'stone', count: 3 },
      { id: 'daylight_detector', count: 1 },
      { id: 'redstone_lamp', count: 4 },
      { id: 'redstone', count: 8 },
      { id: 'repeater', count: 1 },
    ],
    schematics: [
      {
        ru: 'Линия ламп',
        en: 'Lamp line',
        steps: [
          { ru: 'Пол под провод и повторитель.', en: 'Floor under the wire and the repeater.' },
          {
            ru: 'Датчик дня под открытым небом, от него провод. Щёлкните по датчику — он перейдёт в ночной режим.',
            en: 'The daylight detector under open sky, with wire from it. Click it to switch it to night mode.',
          },
          {
            ru: 'Повторитель по дороге освежает сигнал, дальше провод и лампа.',
            en: 'A repeater on the way refreshes the signal, then more wire and the lamp.',
          },
        ],
        layers: [
          { grid: [[_, 'stone', 'stone', 'stone', _]] },
          {
            grid: [
              ['daylight_detector', 'redstone', 'repeater^east@3', 'redstone@3', 'redstone_lamp@3'],
            ],
          },
        ],
      },
    ],
    ruNotes: [
      'В обычном режиме датчик даёт сигнал днём; щелчок переключает его на ночь — именно это нам и нужно.',
      'Провод передаёт сигнал на 15 блоков; повторитель нужен, только если линия ламп длиннее.',
      'В дождь сигнал слабеет, и лампы могут включиться раньше заката. Это не поломка.',
    ],
    enNotes: [
      'In its normal mode the detector fires by day; one click flips it to night, which is what we want.',
      'Wire carries 15 blocks; the repeater is only needed if the lamp line runs longer.',
      'Rain weakens the signal, so lamps may come on before dusk. That is not a fault.',
    ],
  },

  {
    id: 'bubble_elevator',
    category: 'redstone',
    ru: 'Лифт на пузырях',
    en: 'Bubble Elevator',
    icon: 'soul_sand',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Песок душ гонит столб пузырей вверх, магма — вниз. Ни одного редстоуна, а быстрее лестницы.',
    enSummary:
      'Soul sand drives a bubble column up, magma drives one down. No redstone at all, and faster than a ladder.',
    materials: [
      { id: 'soul_sand', count: 1 },
      { id: 'water_bucket', count: 4 },
      { id: 'glass', count: 32 },
      { id: 'oak_sign', count: 2 },
    ],
    schematics: [
      {
        ru: 'Подъёмник',
        en: 'Up shaft',
        steps: [
          {
            ru: 'На дно закрытой стеклянной шахты поставьте песок душ.',
            en: 'Put soul sand at the bottom of an enclosed glass shaft.',
          },
          { ru: 'Первый блок воды над песком.', en: 'The first water block above the sand.' },
          { ru: 'Дальше вверх — вода в каждом блоке шахты.', en: 'Upward from there, water in every block of the shaft.' },
          { ru: 'И ещё выше — так же.', en: 'And higher still, the same.' },
          {
            ru: 'Верх столба: отсюда выходят наружу.',
            en: 'The top of the column: this is where you step out.',
          },
        ],
        layers: [
          { grid: [['glass', 'glass', 'glass'], ['glass', 'soul_sand', 'glass'], ['glass', 'glass', 'glass']] },
          { grid: [['glass', 'glass', 'glass'], ['glass', 'water', 'glass'], ['glass', 'oak_sign', 'glass']] },
          { grid: [['glass', 'glass', 'glass'], ['glass', 'water', 'glass'], ['glass', 'glass', 'glass']] },
          { grid: [['glass', 'glass', 'glass'], ['glass', 'water', 'glass'], ['glass', 'glass', 'glass']] },
          { grid: [['glass', _, 'glass'], ['glass', 'water', 'glass'], ['glass', 'glass', 'glass']] },
        ],
        entities: [{ id: 'lift_item', type: 'item', x: 1.5, y: 1, z: 1.5, scale: .25 }],
        animation: { duration: 28, loop: true, events: [
          { tick: 4, type: 'move', entity: 'lift_item', x: 1.5, y: 2, z: 1.5 },
          { tick: 9, type: 'move', entity: 'lift_item', x: 1.5, y: 3, z: 1.5 },
          { tick: 14, type: 'move', entity: 'lift_item', x: 1.5, y: 4.4, z: 1.5 },
          { tick: 20, type: 'move', entity: 'lift_item', x: 1.5, y: 4.4, z: .5 },
        ] },
      },
    ],
    ruNotes: [
      'Вода должна быть источником в каждом блоке шахты, иначе пузыри оборвутся. Проще всего заливать сверху вниз.',
      'Табличка сбоку у входа удерживает воду от разлива — поставьте её в проёме, через который заходите.',
      'Магма вместо песка душ даёт спуск. Пузыри поднимают и предметы: тот же столб работает подъёмником для лута.',
    ],
    enNotes: [
      'Every block of the shaft must be a water source or the column breaks. Filling top-down is easiest.',
      'A sign at the entrance holds the water back — put it in the gap you walk through.',
      'Magma instead of soul sand gives a way down. Bubbles lift items too, so the same column doubles as a loot elevator.',
    ],
  },

  {
    id: 'auto_door',
    category: 'redstone',
    ru: 'Автоматическая дверь с задержкой',
    en: 'Delayed Automatic Door',
    icon: 'iron_door',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Нажимная плита открывает дверь, а повторитель держит её открытой, пока вы проходите.',
    enSummary: 'A pressure plate opens the door and a repeater holds it while you walk through.',
    materials: [
      { id: 'stone', count: 25 },
      { id: 'iron_door', count: 1 },
      { id: 'stone_pressure_plate', count: 2 },
      { id: 'repeater', count: 2 },
      { id: 'redstone', count: 9 },
    ],
    schematics: [
      {
        ru: 'Проход',
        en: 'The doorway',
        steps: [
          { ru: 'Пол под плиту, провод и дверь.', en: 'Floor under the plate, the wire and the door.' },
          {
            ru: 'Плита и провод прямо к двери: наступили — дверь открылась сразу.',
            en: 'The plate and wire straight to the door: step on it and the door opens at once.',
          },
          {
            ru: 'С каждой стороны своя ветка через повторитель на 4 тика.',
            en: 'Each side has its own branch through a repeater set to 4 ticks.',
          },
          {
            ru: 'Поставьте верхнюю половину двери в том же направлении и проверьте проход с обеих сторон.',
            en: 'Place the upper door half in the same direction and test the passage from both sides.',
          },
        ],
        layers: [
          {
            grid: [
              ['stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone'],
            ],
          },
          {
            grid: [
              [_, _, 'redstone@3', _, _],
              [{ block: 'repeater', facing: 'east', variant: 'delay_4', step: 3 }, 'redstone@3', 'stone_pressure_plate', _, _],
              ['redstone@3', 'redstone@3', { block: 'iron_door', facing: 'east', variant: 'half=lower', step: 2 }, 'redstone@3', 'redstone@3'],
              [_, _, 'stone_pressure_plate', 'redstone@3', { block: 'repeater', facing: 'west', variant: 'delay_4', step: 3 }],
              [_, _, 'redstone@3', _, _],
            ],
          },
          { grid: [[_, _, _], [_, _, _], [_, _, { block: 'iron_door', facing: 'east', variant: 'half=upper', step: 4 }]] },
        ],
        animation: { duration: 36, events: [
          { tick: 4, type: 'press', x: 2, y: 1, z: 1 },
          { tick: 18, type: 'press', x: 2, y: 1, z: 3 },
        ] },
      },
    ],
    ruNotes: [
      'Повторитель на максимуме даёт 0,4 секунды запаса. Нужно дольше — поставьте несколько подряд.',
      'На схеме показаны обе плиты и обе задержанные ветви: дверь одинаково работает при входе и выходе.',
      'Деревянная дверь открывается рукой, поэтому автоматизировать имеет смысл именно железную.',
    ],
    enNotes: [
      'A repeater at maximum gives 0.4 seconds of grace. For longer, chain several.',
      'The far side of the doorway gets an identical plate with its own branch, or you cannot get back out.',
      'A wooden door opens by hand, so automating the iron one is the point.',
    ],
  },
]
