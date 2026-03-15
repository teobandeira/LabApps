"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MdAutoAwesome,
  MdBolt,
  MdCheckCircle,
  MdFavorite,
  MdFlashOn,
  MdGppGood,
  MdLocalFireDepartment,
  MdShield,
  MdSportsEsports,
  MdStars,
} from "react-icons/md";

type Scene = "intro" | "character" | "story" | "battle" | "ending";
type EndingType = "victory" | "defeat" | "alternate";

type Attributes = {
  strength: number;
  defense: number;
  magic: number;
  agility: number;
  energy: number;
  special: number;
};

type CharacterTemplate = {
  id: string;
  name: string;
  className: string;
  description: string;
  strengths: string;
  weaknesses: string;
  specialName: string;
  avatar: string;
  baseHp: number;
  baseCards: number;
  attributes: Attributes;
};

type ChoiceEffects = {
  attributes?: Partial<Attributes>;
  hp?: number;
  energy?: number;
  cards?: number;
  difficulty?: number;
  fate?: number;
};

type StoryChoice = {
  id: string;
  title: string;
  text: string;
  effects: ChoiceEffects;
};

type StoryChapter = {
  id: string;
  title: string;
  ambience: string;
  narrative: string;
  choices: StoryChoice[];
};

type EnemyTemplate = {
  id: string;
  name: string;
  title: string;
  avatar: string;
  taunt: string;
  baseHp: number;
  attack: number;
  defense: number;
  special: number;
};

type EnemyState = {
  name: string;
  title: string;
  avatar: string;
  taunt: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  special: number;
};

type HeroState = {
  id: string;
  name: string;
  className: string;
  description: string;
  strengths: string;
  weaknesses: string;
  specialName: string;
  avatar: string;
  maxHp: number;
  hp: number;
  energy: number;
  forceCards: number;
  attributes: Attributes;
};

type BattleState = {
  enemy: EnemyState;
  round: number;
  playerTurn: boolean;
  guard: number;
  log: string[];
};

type EndingState = {
  type: EndingType;
  title: string;
  description: string;
};

type HeroShowcase = {
  id: string;
  name: string;
  codename: string;
  archetypeId: string;
  summary: string;
  skills: string[];
  image: string;
  imagePositionClass: string;
};

type StoryThemeOption = {
  id: string;
  title: string;
  description: string;
  image: string;
  imagePositionClass: string;
};

const GAME_TITLE = "Heaven - A Batalha do Juízo Final";
const GAME_SUBTITLE =
  "RPG narrativo de batalhas por turnos entre hostes celestiais, juizo final e a promessa do Heaven.";
const FAITH_BOX_BG_IMAGE = "/rpg-hero.jpg";
const HERO_BACKGROUND_IMAGES = [FAITH_BOX_BG_IMAGE, "/rpg-hero2.jpg"] as const;

const LANGUAGE_OPTIONS = [
  { code: "EN", label: "English", flag: "🇺🇸" },
  { code: "PT-BR", label: "Português (Brasil)", flag: "🇧🇷" },
  { code: "ES", label: "Español", flag: "🇪🇸" },
] as const;

const HERO_SHOWCASE: HeroShowcase[] = [
  {
    id: "h1",
    name: "Mikael Sion",
    codename: "Sentinela do Trono",
    archetypeId: "ashes-warrior",
    summary: "Linha de frente com escudo de fe e contra-ataque consagrado.",
    skills: ["Escudo do Pacto", "Golpe da Trombeta"],
    image: "/personagem1.jpg",
    imagePositionClass: "object-[center_20%]",
  },
  {
    id: "h2",
    name: "Hannah Veritas",
    codename: "Profetisa da Luz",
    archetypeId: "void-mage",
    summary: "Controle de area com julgamento celestial e selos sagrados.",
    skills: ["Oraculo da Graca", "Selo do Cordeiro"],
    image: "/personagem2.jpg",
    imagePositionClass: "object-[center_24%]",
  },
  {
    id: "h3",
    name: "Elias Kadosh",
    codename: "Vigia das Nuvens",
    archetypeId: "solar-hunter",
    summary: "Alta mobilidade com ataques precisos guiados pela promessa.",
    skills: ["Flecha da Alvorada", "Passo de Siao"],
    image: "/personagem4.jpg",
    imagePositionClass: "object-[center_32%]",
  },
  {
    id: "h4",
    name: "Mara Hadassa",
    codename: "Chama Celestial",
    archetypeId: "void-mage",
    summary: "Explosao espiritual intensa para encerrar confrontos decisivos.",
    skills: ["Lanca do Trono", "Clamor dos Santos"],
    image: "/personagem3.jpg",
    imagePositionClass: "object-[center_30%]",
  },
];

const STORY_THEMES: StoryThemeOption[] = [
  {
    id: "aurora-ruins",
    title: "Sete Trombetas",
    description: "As trombetas ecoam e cada selo aberto muda o destino dos reinos.",
    image: "/rpg-hero.jpg",
    imagePositionClass: "object-[center_42%]",
  },
  {
    id: "clockwork-siege",
    title: "Queda da Babilonia",
    description: "A cidade arrogante cai enquanto os fieis escolhem entre coragem e medo.",
    image: "/rpg-hero2.jpg",
    imagePositionClass: "object-center",
  },
  {
    id: "veil-pact",
    title: "Arrebatamento dos Fieis",
    description: "Viva o tempo da separacao: vigilantes sobem, os distraidos ficam.",
    image: "/personagem3.jpg",
    imagePositionClass: "object-[center_30%]",
  },
  {
    id: "eclipse-hunt",
    title: "Nova Jerusalem",
    description: "Atravesse o juizo e lute para entrar na cidade celestial de paz eterna.",
    image: "/personagem4.jpg",
    imagePositionClass: "object-[center_30%]",
  },
];

const CHARACTERS: CharacterTemplate[] = [
  {
    id: "ashes-warrior",
    name: "Josue Ben-Ari",
    className: "Guardiao do Pacto",
    description: "Defensor ungido que sustenta a linha com autoridade e fe.",
    strengths: "Resistencia elevada, protecao da equipe e dano estavel.",
    weaknesses: "Alcance menor e menos explosao magica.",
    specialName: "Martelo de Siao",
    avatar: "⚔️",
    baseHp: 136,
    baseCards: 1,
    attributes: {
      strength: 17,
      defense: 16,
      magic: 7,
      agility: 10,
      energy: 11,
      special: 9,
    },
  },
  {
    id: "void-mage",
    name: "Miriam Noa",
    className: "Profetisa do Trono",
    description: "Intercede com autoridade espiritual e libera sinais de julgamento.",
    strengths: "Alto dano especial, controle de area e suporte tatico.",
    weaknesses: "Vida menor e dependencia de energia.",
    specialName: "Voz das Trombetas",
    avatar: "🔮",
    baseHp: 112,
    baseCards: 2,
    attributes: {
      strength: 8,
      defense: 9,
      magic: 18,
      agility: 11,
      energy: 17,
      special: 17,
    },
  },
  {
    id: "solar-hunter",
    name: "Caleb Orion",
    className: "Arqueiro do Heaven",
    description: "Vigia dos ceus que pune rapidamente alvos marcados.",
    strengths: "Critico elevado, agilidade e execucao veloz.",
    weaknesses: "Defesa mediana em confrontos prolongados.",
    specialName: "Chuva de Luz",
    avatar: "🏹",
    baseHp: 124,
    baseCards: 2,
    attributes: {
      strength: 13,
      defense: 11,
      magic: 11,
      agility: 17,
      energy: 13,
      special: 13,
    },
  },
];

const CHAPTERS: StoryChapter[] = [
  {
    id: "gate",
    title: "Capitulo I • Sinais no Ceu",
    ambience: "As trombetas ecoam e o firmamento anuncia o inicio do juizo.",
    narrative:
      "Ao atravessar os Portoes do Testemunho, a terra treme sob seus pes. O primeiro selo se abre e a hoste inimiga avanca.",
    choices: [
      {
        id: "runic-shield",
        title: "Levantar escudo da fe",
        text: "Sua oracao forma uma barreira e reduz o impacto inicial.",
        effects: {
          attributes: { defense: 2, energy: 1 },
          hp: 8,
          difficulty: -1,
          fate: 1,
        },
      },
      {
        id: "shadow-sprint",
        title: "Avancar com zelo",
        text: "Voce corre entre os altares e encontra um angulo de ataque.",
        effects: {
          attributes: { agility: 2, strength: 1 },
          energy: 4,
          difficulty: 0,
          fate: 0,
        },
      },
      {
        id: "forbidden-core",
        title: "Tomar fogo sem preparo",
        text: "Voce ganha poder imediato, mas perde vitalidade e discernimento.",
        effects: {
          attributes: { magic: 3, special: 1 },
          hp: -10,
          cards: 1,
          difficulty: 1,
          fate: -1,
        },
      },
    ],
  },
  {
    id: "market",
    title: "Capitulo II • Vale do Juizo",
    ambience: "Multidoes se reúnem enquanto livros sao abertos diante do tribunal.",
    narrative:
      "No vale, vozes disputam sua obediencia. Cada escolha define sua forca para enfrentar os principados que guardam o caminho.",
    choices: [
      {
        id: "guardian-contract",
        title: "Firmar alianca de santidade",
        text: "Uma palavra de pacto fortalece sua postura na batalha.",
        effects: {
          attributes: { defense: 1, special: 1 },
          hp: 6,
          difficulty: -1,
          fate: 1,
        },
      },
      {
        id: "ignite-blade",
        title: "Empunhar espada do Espirito",
        text: "Seu ataque cresce e uma carta de alianca e fortalecida.",
        effects: {
          attributes: { strength: 2 },
          cards: 1,
          difficulty: 1,
          fate: 0,
        },
      },
      {
        id: "void-elixir",
        title: "Buscar poder sem discernimento",
        text: "Voce aumenta seu potencial, mas abre brecha para o engano.",
        effects: {
          attributes: { magic: 2, energy: 2 },
          hp: -6,
          difficulty: 2,
          fate: -1,
        },
      },
    ],
  },
  {
    id: "obelisk",
    title: "Capitulo III • Trono do Cordeiro",
    ambience: "Um brilho santo envolve o ceu enquanto o ultimo confronto se aproxima.",
    narrative:
      "No limiar da Nova Jerusalem, a Besta levanta seu falso trono. Sua ultima decisao define se voce permanece fiel ou cai na seducao do poder.",
    choices: [
      {
        id: "oath-light",
        title: "Permanecer fiel ao Cordeiro",
        text: "Sua energia estabiliza e as trevas perdem parte da forca.",
        effects: {
          attributes: { energy: 2, defense: 1 },
          hp: 10,
          difficulty: -1,
          fate: 2,
        },
      },
      {
        id: "strike-first",
        title: "Tomar frente na batalha",
        text: "Voce inicia o confronto final com vantagem de impacto.",
        effects: {
          attributes: { strength: 1, agility: 1, special: 1 },
          cards: 1,
          difficulty: 0,
          fate: 0,
        },
      },
      {
        id: "embrace-veil",
        title: "Ceder a marca da Besta",
        text: "O poder das trevas responde, cobrando um preco alto.",
        effects: {
          attributes: { magic: 3, special: 2 },
          hp: -12,
          difficulty: 2,
          fate: -2,
        },
      },
    ],
  },
];

const ENEMIES: EnemyTemplate[] = [
  {
    id: "rust-sentinel",
    name: "Sentinela da Besta",
    title: "Guardiao do Portal Profanado",
    avatar: "🤖",
    taunt: "A marca ja domina esta porta.",
    baseHp: 95,
    attack: 13,
    defense: 8,
    special: 6,
  },
  {
    id: "nebula-arachnid",
    name: "Arauto do Abismo",
    title: "Serpente das Nacoes",
    avatar: "🕷️",
    taunt: "Seu temor alimenta meu reino.",
    baseHp: 116,
    attack: 16,
    defense: 10,
    special: 9,
  },
  {
    id: "beast-archon",
    name: "Arconte da Besta",
    title: "Falso soberano do fim",
    avatar: "👁️",
    taunt: "Prostrem-se ou perecam.",
    baseHp: 148,
    attack: 19,
    defense: 13,
    special: 12,
  },
];

const ATTRIBUTE_META = [
  {
    key: "strength" as const,
    label: "Forca",
    icon: MdLocalFireDepartment,
    gradient: "from-fuchsia-500/30 to-violet-500/28",
    border: "border-fuchsia-300/45",
  },
  {
    key: "defense" as const,
    label: "Defesa",
    icon: MdShield,
    gradient: "from-sky-500/25 to-cyan-500/25",
    border: "border-sky-300/35",
  },
  {
    key: "magic" as const,
    label: "Magia",
    icon: MdStars,
    gradient: "from-fuchsia-500/25 to-violet-500/25",
    border: "border-fuchsia-300/35",
  },
  {
    key: "agility" as const,
    label: "Agilidade",
    icon: MdFlashOn,
    gradient: "from-amber-400/25 to-yellow-300/20",
    border: "border-amber-200/35",
  },
  {
    key: "energy" as const,
    label: "Energia",
    icon: MdBolt,
    gradient: "from-emerald-500/25 to-teal-400/25",
    border: "border-emerald-300/35",
  },
  {
    key: "special" as const,
    label: "Habilidade Especial",
    icon: MdAutoAwesome,
    gradient: "from-indigo-500/25 to-violet-500/25",
    border: "border-indigo-300/35",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildHero(template: CharacterTemplate): HeroState {
  return {
    id: template.id,
    name: template.name,
    className: template.className,
    description: template.description,
    strengths: template.strengths,
    weaknesses: template.weaknesses,
    specialName: template.specialName,
    avatar: template.avatar,
    maxHp: template.baseHp,
    hp: template.baseHp,
    energy: clamp(42 + template.attributes.energy * 2, 0, 100),
    forceCards: template.baseCards,
    attributes: { ...template.attributes },
  };
}

function applyEffects(hero: HeroState, effects: ChoiceEffects): HeroState {
  const nextAttrs: Attributes = { ...hero.attributes };

  if (effects.attributes) {
    for (const [key, value] of Object.entries(effects.attributes)) {
      const typedKey = key as keyof Attributes;
      nextAttrs[typedKey] = clamp(nextAttrs[typedKey] + (value ?? 0), 3, 30);
    }
  }

  const nextHp = clamp(hero.hp + (effects.hp ?? 0), 1, hero.maxHp);
  const nextEnergy = clamp(hero.energy + (effects.energy ?? 0), 0, 100);
  const nextCards = clamp(hero.forceCards + (effects.cards ?? 0), 0, 6);

  return {
    ...hero,
    hp: nextHp,
    energy: nextEnergy,
    forceCards: nextCards,
    attributes: nextAttrs,
  };
}

function summarizeEffects(effects: ChoiceEffects) {
  const chunks: string[] = [];
  if (effects.hp) {
    chunks.push(`HP ${effects.hp > 0 ? "+" : ""}${effects.hp}`);
  }
  if (effects.energy) {
    chunks.push(`Energia ${effects.energy > 0 ? "+" : ""}${effects.energy}`);
  }
  if (effects.cards) {
    chunks.push(`Carta de forca ${effects.cards > 0 ? "+" : ""}${effects.cards}`);
  }
  if (effects.attributes) {
    for (const [key, value] of Object.entries(effects.attributes)) {
      if (!value) continue;
      const label =
        key === "strength"
          ? "Forca"
          : key === "defense"
            ? "Defesa"
            : key === "magic"
              ? "Magia"
              : key === "agility"
                ? "Agilidade"
                : key === "energy"
                  ? "Energia"
                  : "Especial";
      chunks.push(`${label} ${value > 0 ? "+" : ""}${value}`);
    }
  }
  return chunks.length ? chunks.join(" • ") : "Sem alteracoes";
}

function makeEnemy(template: EnemyTemplate, chapter: number, difficulty: number, hero: HeroState): EnemyState {
  const stageScale = 1 + chapter * 0.1;
  const diffScale = 1 + difficulty * 0.07;
  const hp = Math.round(template.baseHp * stageScale * diffScale + hero.attributes.special * 0.8);

  return {
    name: template.name,
    title: template.title,
    avatar: template.avatar,
    taunt: template.taunt,
    hp,
    maxHp: hp,
    attack: Math.round(template.attack * stageScale + difficulty),
    defense: Math.round(template.defense + chapter + Math.max(0, difficulty)),
    special: Math.round(template.special * stageScale + Math.max(0, difficulty)),
  };
}

function computeProgress(scene: Scene, chapterIndex: number, battleIndex: number) {
  if (scene === "intro") return 5;
  if (scene === "character") return 14;
  if (scene === "story") return 24 + chapterIndex * 24;
  if (scene === "battle") return 35 + battleIndex * 22;
  return 100;
}

export default function RPGPage() {
  const [scene, setScene] = useState<Scene>("intro");
  const [activeHeroBackground, setActiveHeroBackground] = useState(0);
  const [selectedStoryThemeId, setSelectedStoryThemeId] = useState(STORY_THEMES[0].id);
  const [hero, setHero] = useState<HeroState | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [battleIndex, setBattleIndex] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [fate, setFate] = useState(0);
  const [ending, setEnding] = useState<EndingState | null>(null);
  const [soundCue, setSoundCue] = useState("Som: vento sobre as trombetas");
  const [lastEffect, setLastEffect] = useState("A vigilia comeca antes do amanhecer.");
  const [isResolvingTurn, setIsResolvingTurn] = useState(false);
  const [highlightedAttr, setHighlightedAttr] = useState<keyof Attributes | null>(null);
  const [choiceTrail, setChoiceTrail] = useState<string[]>([]);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<(typeof LANGUAGE_OPTIONS)[number]["code"]>(
    "PT-BR",
  );
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const sessionRef = useRef(1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveHeroBackground((current) => (current + 1) % HERO_BACKGROUND_IMAGES.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, []);

  const currentChapter = CHAPTERS[chapterIndex];
  const selectedStoryTheme =
    STORY_THEMES.find((theme) => theme.id === selectedStoryThemeId) ?? STORY_THEMES[0];
  const progress = useMemo(
    () => computeProgress(scene, chapterIndex, battleIndex),
    [scene, chapterIndex, battleIndex],
  );
  const chapterProgressValue =
    scene === "intro" || scene === "character"
      ? `0/${CHAPTERS.length}`
      : `${Math.min(chapterIndex + 1, CHAPTERS.length)}/${CHAPTERS.length}`;
  const battlesCleared = Math.min(battleIndex, ENEMIES.length);
  const progressItems = [
    {
      label: "Capitulos",
      icon: MdAutoAwesome,
      value: chapterProgressValue,
      hint: "historia",
      tone: "border-violet-200/20 bg-violet-400/10 text-violet-100",
    },
    {
      label: "Batalhas",
      icon: MdLocalFireDepartment,
      value: `${battlesCleared}/${ENEMIES.length}`,
      hint: "concluidas",
      tone: "border-fuchsia-300/35 bg-fuchsia-500/20 text-fuchsia-100",
    },
    {
      label: "Escolhas",
      icon: MdCheckCircle,
      value: String(choiceTrail.length),
      hint: "decisoes",
      tone: "border-fuchsia-200/20 bg-fuchsia-400/10 text-fuchsia-100",
    },
    {
      label: "Energia",
      icon: MdBolt,
      value: hero ? String(hero.energy) : "--",
      hint: "atual",
      tone: "border-emerald-200/20 bg-emerald-400/10 text-emerald-100",
    },
    {
      label: "Cartas",
      icon: MdSportsEsports,
      value: hero ? String(hero.forceCards) : "--",
      hint: "forca",
      tone: "border-amber-200/20 bg-amber-400/10 text-amber-100",
    },
    {
      label: "Fe",
      icon: MdGppGood,
      value: `${fate > 0 ? "+" : ""}${fate}`,
      hint: "saldo",
      tone: "border-cyan-200/20 bg-cyan-400/10 text-cyan-100",
    },
  ];

  const restartToIntro = () => {
    sessionRef.current += 1;
    setScene("intro");
    setHero(null);
    setBattle(null);
    setChapterIndex(0);
    setBattleIndex(0);
    setDifficulty(0);
    setFate(0);
    setEnding(null);
    setChoiceTrail([]);
    setBattleLog([]);
    setIsResolvingTurn(false);
    setHighlightedAttr(null);
    setSelectedStoryThemeId(STORY_THEMES[0].id);
    setSoundCue("Som: vento sobre as trombetas");
    setLastEffect("A vigilia comeca antes do amanhecer.");
  };

  const startBattle = (index: number, heroSnapshot: HeroState, difficultySnapshot: number) => {
    const template = ENEMIES[index];
    if (!template) return;

    const enemy = makeEnemy(template, index, difficultySnapshot, heroSnapshot);
    const initialLog = [`${enemy.name} ergueu-se contra os fieis.`];

    setBattle({
      enemy,
      round: 1,
      playerTurn: true,
      guard: 0,
      log: initialLog,
    });
    setBattleLog((prev) => [...initialLog, ...prev].slice(0, 14));
    setScene("battle");
    setSoundCue("Som: trombetas de guerra");
    setLastEffect(enemy.taunt);
    setIsResolvingTurn(false);
    setHighlightedAttr(null);
  };

  const finishGame = (type: EndingType, heroSnapshot: HeroState, lastMessage: string) => {
    const finalTitle =
      type === "victory"
        ? "Vitoria do Cordeiro"
        : type === "alternate"
          ? "Final Alternativo: Coroa da Besta"
          : "Queda dos Vigilantes";

    const finalDescription =
      type === "victory"
        ? `${heroSnapshot.name} permaneceu fiel e entrou na Nova Jerusalem com ${heroSnapshot.hp} HP restantes.`
        : type === "alternate"
          ? `${heroSnapshot.name} venceu a guerra, mas aceitou a coroa da Besta. Poder imediato, destino sombrio.`
          : `${heroSnapshot.name} caiu no vale do juizo. A vigilia aguarda um novo fiel.`;

    setEnding({
      type,
      title: finalTitle,
      description: finalDescription,
    });
    setScene("ending");
    setBattle(null);
    setIsResolvingTurn(false);
    setSoundCue(type === "defeat" ? "Som: silencio do santuario" : "Som: coros celestiais");
    setLastEffect(lastMessage);
  };

  const resolveBattleWin = (heroSnapshot: HeroState, enemyName: string) => {
    const rewardHP = 8 + battleIndex * 3;
    const rewardEnergy = 12;
    const rewardCards = battleIndex === 1 ? 1 : 0;
    const rewardSpecial = battleIndex === 2 ? 1 : 0;

    const nextHero: HeroState = {
      ...heroSnapshot,
      hp: clamp(heroSnapshot.hp + rewardHP, 0, heroSnapshot.maxHp),
      energy: clamp(heroSnapshot.energy + rewardEnergy, 0, 100),
      forceCards: clamp(heroSnapshot.forceCards + rewardCards, 0, 6),
      attributes: {
        ...heroSnapshot.attributes,
        special: clamp(heroSnapshot.attributes.special + rewardSpecial, 3, 30),
      },
    };

    setHero(nextHero);
    setBattle(null);
    setBattleLog((prev) => [`Vitoria sobre ${enemyName}.`, ...prev].slice(0, 14));

    const rewardLine = `Recompensas: HP +${rewardHP} • Energia +${rewardEnergy}${
      rewardCards ? ` • Carta +${rewardCards}` : ""
    }${rewardSpecial ? ` • Especial +${rewardSpecial}` : ""}`;

    setLastEffect(rewardLine);
    setSoundCue("Som: coro da vitoria");

    if (battleIndex >= ENEMIES.length - 1) {
      const endingType: EndingType = fate <= -2 ? "alternate" : "victory";
      finishGame(
        endingType,
        nextHero,
        endingType === "alternate"
          ? "Voce venceu, mas aceitou a marca da Besta."
          : "A Nova Jerusalem foi preservada pelo seu testemunho.",
      );
      return;
    }

    setChapterIndex((current) => current + 1);
    setBattleIndex((current) => current + 1);
    setScene("story");
    setHighlightedAttr(null);
  };

  const resolveEnemyTurn = (heroSnapshot: HeroState, battleSnapshot: BattleState, sessionId: number) => {
    if (sessionId !== sessionRef.current) return;

    if (battleSnapshot.enemy.hp <= 0) {
      resolveBattleWin(heroSnapshot, battleSnapshot.enemy.name);
      return;
    }

    const specialStrike = Math.random() < 0.24 + battleIndex * 0.05;
    const base = battleSnapshot.enemy.attack + randomInt(6, 12);
    const specialBonus = specialStrike ? battleSnapshot.enemy.special : 0;
    const rawDamage = base + specialBonus;
    const blocked = Math.min(rawDamage, battleSnapshot.guard);
    const postGuard = rawDamage - blocked;
    const reduced = Math.max(2, postGuard - Math.floor(heroSnapshot.attributes.defense * 0.55));
    const nextHP = clamp(heroSnapshot.hp - reduced, 0, heroSnapshot.maxHp);

    const enemyText = specialStrike
      ? `${battleSnapshot.enemy.name} liberou um golpe de juizo e causou ${reduced} de dano.`
      : `${battleSnapshot.enemy.name} investiu e causou ${reduced} de dano.`;

    const nextHero: HeroState = {
      ...heroSnapshot,
      hp: nextHP,
      energy: clamp(heroSnapshot.energy + 6, 0, 100),
    };

    const nextBattle: BattleState = {
      ...battleSnapshot,
      round: battleSnapshot.round + 1,
      playerTurn: nextHP > 0,
      guard: 0,
      log: [enemyText, ...battleSnapshot.log].slice(0, 8),
    };

    setHero(nextHero);
    setBattle(nextBattle);
    setBattleLog((prev) => [enemyText, ...prev].slice(0, 14));
    setLastEffect(enemyText);
    setSoundCue(specialStrike ? "Som: trovao do juizo" : "Som: espadas em choque");
    setIsResolvingTurn(false);
    setHighlightedAttr(null);

    if (nextHP <= 0) {
      finishGame("defeat", nextHero, "Sua vigilia terminou no campo de juizo.");
    }
  };

  const performPlayerAction = (action: "attack" | "defend" | "special" | "force-card") => {
    if (!hero || !battle || isResolvingTurn || !battle.playerTurn) return;

    const nextHero: HeroState = { ...hero };
    const nextBattle: BattleState = {
      ...battle,
      enemy: { ...battle.enemy },
      log: [...battle.log],
      playerTurn: false,
    };

    let playerText = "";

    if (action === "attack") {
      const critical = Math.random() < 0.12 + hero.attributes.agility * 0.003;
      const base = hero.attributes.strength + randomInt(5, 11) + Math.floor(hero.attributes.agility * 0.35);
      const damage = Math.max(
        4,
        Math.round((critical ? base * 1.45 : base) - nextBattle.enemy.defense * 0.45),
      );
      nextBattle.enemy.hp = clamp(nextBattle.enemy.hp - damage, 0, nextBattle.enemy.maxHp);
      nextHero.energy = clamp(hero.energy + 10, 0, 100);
      playerText = critical
        ? `Critico! Golpe de fe causou ${damage} de dano.`
        : `Golpe de fe causou ${damage} de dano.`;
      setHighlightedAttr("strength");
      setSoundCue("Som: lamina consagrada");
    }

    if (action === "defend") {
      const guard = Math.max(10, Math.floor(hero.attributes.defense * 1.45) + randomInt(3, 7));
      nextBattle.guard = guard;
      nextHero.energy = clamp(hero.energy + 14, 0, 100);
      playerText = `Escudo da fe ativo. Proximo golpe reduzido em ate ${guard}.`;
      setHighlightedAttr("defense");
      setSoundCue("Som: escudo da fe");
    }

    if (action === "special") {
      const cost = 35;
      if (hero.energy < cost) {
        setLastEffect("Energia insuficiente para invocar o poder celestial.");
        setSoundCue("Som: folego espiritual baixo");
        return;
      }
      const base = hero.attributes.magic + hero.attributes.special + randomInt(12, 20);
      const damage = Math.max(10, Math.round(base - nextBattle.enemy.defense * 0.28));
      nextBattle.enemy.hp = clamp(nextBattle.enemy.hp - damage, 0, nextBattle.enemy.maxHp);
      nextHero.energy = clamp(hero.energy - cost, 0, 100);
      playerText = `${hero.specialName} atingiu o inimigo com ${damage} de dano sagrado.`;
      setHighlightedAttr("magic");
      setSoundCue("Som: fogo celestial");
    }

    if (action === "force-card") {
      if (hero.forceCards <= 0) {
        setLastEffect("Sem cartas de alianca disponiveis.");
        setSoundCue("Som: selo indisponivel");
        return;
      }
      const damage =
        hero.attributes.strength * 2 + hero.attributes.special + randomInt(10, 18);
      nextBattle.enemy.hp = clamp(nextBattle.enemy.hp - damage, 0, nextBattle.enemy.maxHp);
      nextHero.forceCards = clamp(hero.forceCards - 1, 0, 6);
      nextHero.energy = clamp(hero.energy + 6, 0, 100);
      playerText = `Carta de Alianca ativada: ${damage} de dano colossal.`;
      setHighlightedAttr("special");
      setSoundCue("Som: selo ancestral");
    }

    nextBattle.log = [playerText, ...nextBattle.log].slice(0, 8);

    setHero(nextHero);
    setBattle(nextBattle);
    setBattleLog((prev) => [playerText, ...prev].slice(0, 14));
    setLastEffect(playerText);

    if (nextBattle.enemy.hp <= 0) {
      setIsResolvingTurn(true);
      const activeSession = sessionRef.current;
      window.setTimeout(() => {
        if (activeSession !== sessionRef.current) return;
        resolveBattleWin(nextHero, nextBattle.enemy.name);
      }, 620);
      return;
    }

    setIsResolvingTurn(true);
    const activeSession = sessionRef.current;
    window.setTimeout(() => {
      resolveEnemyTurn(nextHero, nextBattle, activeSession);
    }, 900);
  };

  const chooseCharacter = (template: CharacterTemplate) => {
    sessionRef.current += 1;
    const freshHero = buildHero(template);
    setHero(freshHero);
    setScene("story");
    setChapterIndex(0);
    setBattleIndex(0);
    setDifficulty(0);
    setFate(0);
    setEnding(null);
    setBattle(null);
    setChoiceTrail([`Vigilante escolhido: ${template.className}`]);
    setBattleLog([]);
    setIsResolvingTurn(false);
    setHighlightedAttr(null);
    setSoundCue("Som: chamado da vigilia");
    setLastEffect(`${template.name} inicia a vigilia rumo ao Heaven.`);
  };

  const chooseStoryPath = (choice: StoryChoice) => {
    if (!hero || !currentChapter || isResolvingTurn) return;

    const nextHero = applyEffects(hero, choice.effects);
    const nextDifficulty = difficulty + (choice.effects.difficulty ?? 0);
    const nextFate = fate + (choice.effects.fate ?? 0);

    setHero(nextHero);
    setDifficulty(nextDifficulty);
    setFate(nextFate);
    setChoiceTrail((prev) => [`${currentChapter.title}: ${choice.title}`, ...prev].slice(0, 10));
    setLastEffect(`${choice.text} (${summarizeEffects(choice.effects)})`);
    setSoundCue("Som: decisao de fe");

    startBattle(battleIndex, nextHero, nextDifficulty);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050214] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,0.36),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(56,189,248,0.24),transparent_33%),linear-gradient(160deg,#050214,#0b0821_42%,#130c2f_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-35 bg-[linear-gradient(to_right,rgba(192,132,252,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(192,132,252,0.16)_1px,transparent_1px)] bg-size-[38px_38px]" />
      <div className="pointer-events-none absolute -left-24 top-14 -z-10 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 -z-10 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl" />

      <nav className="sticky top-0 z-40 w-full bg-white/5 shadow-xl backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-5">
            <Link href="/rpg" className="inline-flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/85 text-white ring-2 ring-fuchsia-300/60">
                <MdLocalFireDepartment className="h-5 w-5" />
              </span>
              <span className="text-sm font-black tracking-[0.18em] text-white">
                MINI<span className="text-fuchsia-300">RPG</span>
              </span>
            </Link>
            <Link href="/" className="font-semibold text-violet-100 transition hover:text-white">
              Início
            </Link>
            <a href="#" className="font-medium text-violet-100/90 transition hover:text-white">
              Comunidade
            </a>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <a
              href="#"
              className="rounded-full border border-white/30 bg-black/20 px-3 py-1.5 font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              Login
            </a>
            <a
              href="#"
              className="rounded-full bg-fuchsia-500/85 px-3 py-1.5 font-semibold text-white transition hover:bg-fuchsia-400"
            >
              Cadastro
            </a>

            <div className="relative">
              <button
                type="button"
                onClick={() => setLanguageMenuOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-violet-100 transition hover:bg-white/10"
              >
                🌐 {selectedLanguage}
                <span className="text-[10px] opacity-80">▾</span>
              </button>

              {languageMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-47.5 overflow-hidden rounded-xl border border-violet-200/25 bg-[#110826]/95 p-1.5 shadow-[0_14px_32px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setLanguageMenuOpen(false);
                        setSoundCue(`Idioma selecionado: ${lang.code}`);
                        setLastEffect(`Interface ajustada para ${lang.label}.`);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                        selectedLanguage === lang.code
                          ? "bg-violet-500/30 text-white"
                          : "text-zinc-200 hover:bg-white/10"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span className="font-semibold uppercase tracking-[0.08em]">{lang.code}</span>
                      </span>
                      <span className="text-[11px] opacity-85">{lang.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-0 sm:px-6 sm:pb-8 sm:pt-0 lg:px-8 lg:pb-8 lg:pt-0">

        <header className="relative left-1/2 right-1/2 isolate min-h-125 w-screen max-w-none -translate-x-1/2 overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.5)]">
          <div className="pointer-events-none absolute inset-0 z-0 h-full w-full">
            {HERO_BACKGROUND_IMAGES.map((imageSrc, index) => (
              <Image
                key={imageSrc}
                src={imageSrc}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className={`object-cover object-center transition-opacity duration-1800 ease-in-out ${
                  activeHeroBackground === index ? "opacity-65" : "opacity-0"
                }`}
                aria-hidden
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-r from-[#140528]/72 via-[#1c0d3f]/56 to-[#060312]/76" />
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(236,72,153,0.22),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.2),transparent_46%)]" />
          <div className="pointer-events-none absolute inset-0 z-10 backdrop-blur-[1.2px]" />

          <div className="relative z-20 mx-auto grid h-full w-full max-w-7xl gap-5 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:p-10">
            <div className="self-center justify-self-center text-center lg:justify-self-start lg:text-left">
              <p className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fuchsia-100">
                <MdSportsEsports className="h-4 w-4" />
                Mini <span className="text-fuchsia-300">RPG</span> Premium
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                {GAME_TITLE}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-200 sm:text-base">
                {GAME_SUBTITLE}
              </p>
              <p className="mt-6 max-w-2xl text-sm text-violet-100/90">
                Apocalipse biblico, batalha espiritual e escolhas de fe em uma experiencia de pagina unica.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setScene("character");
                    setSoundCue("Som: portoes celestiais abrindo");
                    setLastEffect("A Jornada comecou.");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/35 transition hover:scale-[1.02] hover:bg-violet-400"
                >
                  Iniciar Jornada
                  <MdStars className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="self-end w-full max-w-xl justify-self-center rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-md lg:justify-self-end">
              <div className="rounded-2xl border border-violet-200/20 bg-white/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
                  Progresso da vigilia
                </p>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-700/70">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-300 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-200">{Math.round(progress)}% concluido</p>
              </div>

              <div className="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-400/10 p-3">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                  Efeito sonoro visual
                </p>
                <p className="mt-2 text-xs font-semibold text-cyan-50">{soundCue}</p>
                <p className="mt-1 text-xs text-cyan-100/80">{lastEffect}</p>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {progressItems.map((item) => (
                  <article
                    key={item.label}
                    className={`rounded-xl border p-2.5 ${item.tone}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-85">
                        {item.label}
                      </p>
                      <item.icon className="h-3.5 w-3.5 opacity-90" />
                    </div>
                    <p className="mt-1 text-lg font-black leading-none">{item.value}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] opacity-80">
                      {item.hint}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </header>

        {scene === "intro" && (
          <section className="relative left-1/2 right-1/2 my-0 w-screen max-w-none -translate-x-1/2 bg-linear-to-br from-violet-500/20 via-fuchsia-500/12 to-cyan-400/10 px-6 py-10 shadow-xl">
            <div className="mx-auto w-full max-w-7xl">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-100">
                Como funciona
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-xl border border-white/15 bg-black/25 p-4 text-center">
                  <div className="relative mx-auto h-22 w-22 overflow-hidden rounded-full border border-violet-200/25">
                    <Image
                      src="/personagem1.jpg"
                      alt="Vigilante ficticio para escolha de classe"
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-base font-bold text-white">1. Escolha seu vigilante</p>
                    <p className="mt-1 text-sm text-zinc-200">
                      Defina seu vigilante e o chamado espiritual para iniciar a vigilia.
                    </p>
                  </div>
                </article>

                <article className="rounded-xl border border-white/15 bg-black/25 p-4 text-center">
                  <div className="relative mx-auto h-22 w-22 overflow-hidden rounded-full border border-violet-200/25">
                    <Image
                      src="/personagem2.jpg"
                      alt="Vigilante ficticio em narrativa interativa"
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-base font-bold text-white">2. Tome decisoes narrativas</p>
                    <p className="mt-1 text-sm text-zinc-200">
                      Cada escolha de fe altera atributos, energia e nivel de desafio.
                    </p>
                  </div>
                </article>

                <article className="rounded-xl border border-white/15 bg-black/25 p-4 text-center">
                  <div className="relative mx-auto h-22 w-22 overflow-hidden rounded-full border border-violet-200/25">
                    <Image
                      src="/personagem3.jpg"
                      alt="Vigilante ficticio durante batalha espiritual"
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-base font-bold text-white">3. Batalhas espirituais</p>
                    <p className="mt-1 text-sm text-zinc-200">
                      Use golpes, defesa, poder celestial e cartas de alianca para vencer.
                    </p>
                  </div>
                </article>

                <article className="rounded-xl border border-white/15 bg-black/25 p-4 text-center">
                  <div className="relative mx-auto h-22 w-22 overflow-hidden rounded-full border border-violet-200/25">
                    <Image
                      src="/personagem4.jpg"
                      alt="Vigilante ficticio no desfecho eterno"
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-base font-bold text-white">4. Desfecho eterno</p>
                    <p className="mt-1 text-sm text-zinc-200">
                      Receba final de fidelidade, queda ou coroa da Besta conforme seu caminho.
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </section>
        )}

        {(scene === "intro" || scene === "character") && (
          <section className="relative left-1/2 right-1/2 my-0 w-screen max-w-none -translate-x-1/2 rounded-3xl bg-white/5 px-4 py-10 shadow-xl backdrop-blur-md sm:px-5 sm:py-10">
            <div className="mx-auto w-full max-w-7xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
                    Vigilantes do Apocalipse
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Escolha entre 4 sentinelas do Heaven
                  </h2>
                </div>
                <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold text-fuchsia-100">
                  Imagens ficticias • uso demonstrativo
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {HERO_SHOWCASE.map((heroCard) => (
                  <article
                    key={heroCard.id}
                    className="group overflow-hidden rounded-2xl border border-violet-200/20 bg-black/30 transition hover:-translate-y-0.5 hover:border-violet-200/35"
                  >
                    <div className="relative h-44 overflow-hidden border-b border-violet-200/15">
                      <Image
                        src={heroCard.image}
                        alt={heroCard.name}
                        fill
                        sizes="(min-width: 1280px) 22vw, (min-width: 640px) 48vw, 100vw"
                        className={`object-cover transition duration-500 group-hover:scale-[1.04] ${heroCard.imagePositionClass}`}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#0b0618]/92 via-[#0b0618]/20 to-transparent" />
                      <p className="absolute bottom-2 left-2 rounded-full border border-violet-200/30 bg-black/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-100">
                        {heroCard.codename}
                      </p>
                    </div>

                    <div className="space-y-3 p-3.5">
                      <div>
                        <h3 className="text-base font-bold text-white">{heroCard.name}</h3>
                        <p className="text-xs text-zinc-300">{heroCard.summary}</p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {heroCard.skills.map((skill) => (
                          <span
                            key={`${heroCard.id}-${skill}`}
                            className="rounded-full border border-violet-200/20 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-100"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const archetype = CHARACTERS.find(
                            (character) => character.id === heroCard.archetypeId,
                          );
                          if (archetype) {
                            chooseCharacter(archetype);
                            setSoundCue(`Som: chamado de ${heroCard.name}`);
                            setLastEffect(`${heroCard.name} foi escolhido para a vigilia.`);
                          }
                        }}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-fuchsia-500/85 px-3 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                      >
                        Escolher personagem
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {scene === "intro" && (
          <section className="mt-6 space-y-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <article className="relative overflow-hidden rounded-3xl border border-violet-200/20 bg-white/5 p-6 shadow-xl backdrop-blur-md sm:p-8">
                <div className="pointer-events-none absolute inset-0">
                  <Image
                    src={FAITH_BOX_BG_IMAGE}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="object-cover object-center opacity-70"
                    aria-hidden
                  />
                  <div className="absolute inset-0 bg-linear-to-br from-[#0a0518]/55 via-[#120726]/45 to-[#090513]/62" />
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                    Profecias do fim dos tempos
                  </p>
                  <h2 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl">
                    Firme sua fe entre o juizo e a promessa do Heaven.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                    Escolha um vigilante, tome decisoes espirituais que alteram seus atributos e
                    enfrente hostes inimigas em batalhas por turnos com cartas de alianca.
                  </p>
                  <p className="mt-4 inline-flex rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold text-fuchsia-100">
                    Tema atual: {selectedStoryTheme.title}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setScene("character");
                        setSoundCue("Som: portoes celestiais abrindo");
                        setLastEffect(`A Jornada comecou em ${selectedStoryTheme.title}.`);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/35 transition hover:scale-[1.02] hover:bg-violet-400"
                    >
                      Iniciar Jornada
                      <MdStars className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={restartToIntro}
                      className="rounded-xl border border-white/20 bg-black/25 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
                    >
                      Reiniciar
                    </button>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-fuchsia-200/20 bg-linear-to-br from-violet-500/20 via-fuchsia-500/12 to-cyan-400/10 p-6 shadow-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-100">
                  Temas profeticos
                </p>
                <p className="mt-2 text-sm text-zinc-200">
                  Escolha o tema narrativo antes de iniciar sua vigilia.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {STORY_THEMES.map((theme) => {
                    const isSelected = theme.id === selectedStoryThemeId;
                    return (
                      <article
                        key={theme.id}
                        className={`overflow-hidden rounded-xl border bg-black/25 ${
                          isSelected
                            ? "border-fuchsia-300/45 shadow-[0_10px_30px_rgba(236,72,153,0.22)]"
                            : "border-white/15"
                        }`}
                      >
                        <div className="relative h-24">
                          <Image
                            src={theme.image}
                            alt={`Imagem ficticia do tema ${theme.title}`}
                            fill
                            sizes="(min-width: 640px) 240px, 100vw"
                            className={`object-cover ${theme.imagePositionClass}`}
                          />
                        </div>
                        <div className="space-y-2 p-3">
                          <p className="text-sm font-bold text-white">{theme.title}</p>
                          <p className="text-xs leading-relaxed text-zinc-200">{theme.description}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStoryThemeId(theme.id);
                              setSoundCue(`Som: tema profetico ${theme.title}`);
                              setLastEffect(`Tema escolhido: ${theme.title}.`);
                            }}
                            className={`inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition ${
                              isSelected
                                ? "bg-fuchsia-500/85 text-white hover:bg-fuchsia-400"
                                : "border border-white/20 bg-black/25 text-zinc-100 hover:bg-white/10"
                            }`}
                          >
                            {isSelected ? "Historia escolhida" : "Escolher historia"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </article>
            </div>

          </section>
        )}

        {scene === "character" && (
          <section className="mt-6 space-y-5">
            <div className="rounded-3xl border border-violet-200/20 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
                Escolha do vigilante
              </p>
              <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">Defina seu chamado</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {CHARACTERS.map((character) => (
                <article
                  key={character.id}
                  className="group rounded-3xl border border-violet-200/20 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-violet-200/40 hover:bg-white/8"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-3xl">{character.avatar}</p>
                      <h3 className="mt-3 text-xl font-bold text-white">{character.className}</h3>
                      <p className="text-sm text-violet-100">{character.name}</p>
                    </div>
                    <span className="rounded-full border border-violet-200/25 bg-violet-400/15 px-2.5 py-1 text-[11px] font-semibold text-violet-100">
                      HP {character.baseHp}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-zinc-300">{character.description}</p>

                  <div className="mt-4 space-y-2 text-xs">
                    <p className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-2 text-emerald-100">
                      <strong>Ponto forte:</strong> {character.strengths}
                    </p>
                    <p className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-2 text-amber-100">
                      <strong>Ponto fraco:</strong> {character.weaknesses}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {ATTRIBUTE_META.map((item) => (
                      <div
                        key={item.key}
                        className={`rounded-xl border p-2 text-xs ${item.border} bg-black/25`}
                      >
                        <p className="text-zinc-300">{item.label}</p>
                        <p className="text-sm font-bold text-white">
                          {character.attributes[item.key]}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => chooseCharacter(character)}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
                  >
                    Escolher personagem
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {scene === "story" && hero && currentChapter && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <article className="rounded-3xl border border-violet-200/20 bg-white/5 p-6 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
                Profecia interativa
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">{currentChapter.title}</h2>
              <p className="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-400/10 p-3 text-sm text-cyan-50">
                {currentChapter.ambience}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-200 sm:text-base">
                {currentChapter.narrative}
              </p>

              <div className="mt-5 grid gap-3">
                {currentChapter.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => chooseStoryPath(choice)}
                    className="group rounded-2xl border border-violet-200/20 bg-black/30 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-200/40 hover:bg-violet-500/10"
                  >
                    <p className="text-sm font-bold text-white">{choice.title}</p>
                    <p className="mt-1 text-sm text-zinc-300">{choice.text}</p>
                    <p className="mt-2 text-xs font-semibold text-violet-200">
                      {summarizeEffects(choice.effects)}
                    </p>
                  </button>
                ))}
              </div>
            </article>

            <aside className="space-y-4">
              <article className="rounded-3xl border border-violet-200/20 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-200">Status do vigilante</p>
                  <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-100">
                    {hero.className}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/18 p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-fuchsia-100">Vida</p>
                    <p className="text-xl font-black text-white">
                      {hero.hp}/{hero.maxHp}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200/20 bg-emerald-500/10 p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-100">
                      Energia atual
                    </p>
                    <p className="text-xl font-black text-white">{hero.energy}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {ATTRIBUTE_META.map((item) => {
                    const Icon = item.icon;
                    const value = hero.attributes[item.key];
                    return (
                      <div
                        key={item.key}
                        className={`rounded-xl border p-3 ${item.border} bg-linear-to-br ${item.gradient}`}
                      >
                        <p className="inline-flex items-center gap-1 text-xs font-semibold text-white">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
                          <div
                            className="h-full rounded-full bg-white/90 transition-all duration-500"
                            style={{ width: `${clamp(value * 4, 8, 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-sm font-bold text-white">{value}</p>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-3xl border border-violet-200/20 bg-white/5 p-4">
                <p className="text-sm font-semibold text-zinc-200">Trilha da vigilia</p>
                <ul className="mt-3 space-y-2 text-xs text-zinc-300">
                  {choiceTrail.length ? (
                    choiceTrail.slice(0, 6).map((item) => (
                      <li key={item} className="rounded-lg border border-white/10 bg-black/25 p-2">
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg border border-white/10 bg-black/25 p-2">
                      Nenhuma decisao registrada.
                    </li>
                  )}
                </ul>
              </article>
            </aside>
          </section>
        )}

        {scene === "battle" && hero && battle && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <article className="rounded-3xl border border-violet-200/20 bg-white/5 p-5 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
                    Batalha {battleIndex + 1} de {ENEMIES.length}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">Turno {battle.round}</h2>
                  <p className="mt-1 text-sm text-zinc-300">{battle.enemy.taunt}</p>
                </div>
                <span className="rounded-full border border-fuchsia-200/25 bg-fuchsia-500/15 px-3 py-1 text-xs font-semibold text-fuchsia-100">
                  {battle.playerTurn ? "Sua vez" : "Hoste inimiga agindo"}
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-violet-200/20 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-400">Vigilante</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-lg font-bold text-white">
                      {hero.avatar} {hero.name}
                    </p>
                    <p className="text-xs text-zinc-300">{hero.className}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-zinc-300">
                        <span>Vida</span>
                        <span>
                          {hero.hp}/{hero.maxHp}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-fuchsia-400 to-violet-500 transition-all duration-500"
                          style={{ width: `${(hero.hp / hero.maxHp) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-zinc-300">
                        <span>Energia</span>
                        <span>{hero.energy}/100</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-emerald-300 to-cyan-300 transition-all duration-500"
                          style={{ width: `${hero.energy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-200/20 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-400">Adversario</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-lg font-bold text-white">
                      {battle.enemy.avatar} {battle.enemy.name}
                    </p>
                    <p className="text-xs text-zinc-300">{battle.enemy.title}</p>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-300">
                      <span>Vida</span>
                      <span>
                        {battle.enemy.hp}/{battle.enemy.maxHp}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-fuchsia-400 to-violet-500 transition-all duration-500"
                        style={{ width: `${(battle.enemy.hp / battle.enemy.maxHp) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!battle.playerTurn || isResolvingTurn}
                  onClick={() => performPlayerAction("attack")}
                  className="rounded-xl border border-fuchsia-300/45 bg-fuchsia-500/25 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/35 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Golpe de fe
                </button>
                <button
                  type="button"
                  disabled={!battle.playerTurn || isResolvingTurn}
                  onClick={() => performPlayerAction("defend")}
                  className="rounded-xl border border-sky-300/35 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Defender com fe
                </button>
                <button
                  type="button"
                  disabled={!battle.playerTurn || isResolvingTurn || hero.energy < 35}
                  onClick={() => performPlayerAction("special")}
                  className="rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/15 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Invocar Poder Celestial
                </button>
                <button
                  type="button"
                  disabled={!battle.playerTurn || isResolvingTurn || hero.forceCards <= 0}
                  onClick={() => performPlayerAction("force-card")}
                  className="rounded-xl border border-amber-300/35 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Usar Carta de Alianca ({hero.forceCards})
                </button>
              </div>
            </article>

            <aside className="space-y-4">
              <article className="rounded-3xl border border-violet-200/20 bg-white/5 p-4">
                <p className="text-sm font-semibold text-zinc-200">Dons espirituais</p>
                <div className="mt-3 grid gap-2">
                  {ATTRIBUTE_META.map((item) => {
                    const Icon = item.icon;
                    const highlighted = highlightedAttr === item.key;
                    return (
                      <div
                        key={item.key}
                        className={`rounded-xl border p-3 transition ${
                          highlighted
                            ? "border-white bg-white/18 scale-[1.01]"
                            : `${item.border} bg-black/25`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="inline-flex items-center gap-1 text-xs font-semibold text-white">
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </p>
                          <p className="text-sm font-bold text-white">
                            {hero.attributes[item.key]}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-3xl border border-violet-200/20 bg-white/5 p-4">
                <p className="text-sm font-semibold text-zinc-200">Registro da batalha</p>
                <ul className="mt-3 space-y-2 text-xs text-zinc-300">
                  {battle.log.map((line, index) => (
                    <li key={`battle-log-${index}`} className="rounded-lg border border-white/10 bg-black/25 p-2">
                      {line}
                    </li>
                  ))}
                </ul>
              </article>
            </aside>
          </section>
        )}

        {scene === "ending" && hero && ending && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <article className="rounded-3xl border border-violet-200/20 bg-white/5 p-6 shadow-xl">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                  ending.type === "defeat"
                    ? "border border-fuchsia-300/45 bg-fuchsia-500/25 text-fuchsia-100"
                    : ending.type === "alternate"
                      ? "border border-amber-300/40 bg-amber-500/20 text-amber-100"
                      : "border border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                }`}
              >
                <MdCheckCircle className="h-4 w-4" />
                {ending.type === "defeat"
                  ? "Derrota"
                  : ending.type === "alternate"
                    ? "Queda espiritual"
                    : "Vitoria"}
              </span>

              <h2 className="mt-3 text-3xl font-black text-white">{ending.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300 sm:text-base">
                {ending.description}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/18 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-fuchsia-100">Vida final</p>
                  <p className="text-xl font-black text-white">{hero.hp}</p>
                </div>
                <div className="rounded-xl border border-emerald-200/20 bg-emerald-500/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-100">
                    Energia final
                  </p>
                  <p className="text-xl font-black text-white">{hero.energy}</p>
                </div>
                <div className="rounded-xl border border-violet-200/20 bg-violet-500/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-violet-100">Fe final</p>
                  <p className="text-xl font-black text-white">{fate}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={restartToIntro}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400"
              >
                Iniciar nova vigilia
                <MdFavorite className="h-4 w-4" />
              </button>
            </article>

            <aside className="space-y-4">
              <article className="rounded-3xl border border-violet-200/20 bg-white/5 p-4">
                <p className="text-sm font-semibold text-zinc-200">Resumo da vigilia</p>
                <ul className="mt-3 space-y-2 text-xs text-zinc-300">
                  {choiceTrail.length ? (
                    choiceTrail.map((item) => (
                      <li key={item} className="rounded-lg border border-white/10 bg-black/25 p-2">
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg border border-white/10 bg-black/25 p-2">
                      Nenhuma decisao registrada.
                    </li>
                  )}
                </ul>
              </article>

              <article className="rounded-3xl border border-violet-200/20 bg-white/5 p-4">
                <p className="text-sm font-semibold text-zinc-200">Historico da batalha</p>
                <ul className="mt-3 space-y-2 text-xs text-zinc-300">
                  {battleLog.length ? (
                    battleLog.slice(0, 8).map((line, index) => (
                      <li key={`history-log-${index}`} className="rounded-lg border border-white/10 bg-black/25 p-2">
                        {line}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg border border-white/10 bg-black/25 p-2">
                      Sem eventos registrados.
                    </li>
                  )}
                </ul>
              </article>
            </aside>
          </section>
        )}

        <footer className="mt-8 overflow-hidden rounded-3xl bg-linear-to-br from-[#120726]/90 via-[#180a34]/88 to-[#090515]/95 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500/85 text-white ring-2 ring-fuchsia-300/60">
                  <MdLocalFireDepartment className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black tracking-[0.16em] text-white">
                    MINI<span className="text-fuchsia-300">RPG</span>
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-violet-200">
                    Apocalipse de Siao
                  </p>
                </div>
              </div>

              <p className="max-w-md text-sm leading-relaxed text-zinc-300">
                Narrativa biblica interativa com escolhas de fe, combate por turnos e desfechos
                dinamicos rumo ao Heaven.
              </p>

              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                <MdGppGood className="h-4 w-4" />
                Sessao ativa e pronta para nova vigilia.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
                Navegacao
              </p>
              <div className="grid gap-2 text-sm text-zinc-200">
                <Link
                  href="/rpg"
                  className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 transition hover:bg-white/10"
                >
                  Inicio do RPG
                </Link>
                <Link
                  href="/"
                  className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 transition hover:bg-white/10"
                >
                  Voltar ao Hub
                </Link>
                <button
                  type="button"
                  onClick={restartToIntro}
                  className="rounded-lg border border-fuchsia-300/25 bg-fuchsia-500/15 px-3 py-2 text-left text-fuchsia-100 transition hover:bg-fuchsia-500/25"
                >
                  Reiniciar vigilia
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
                Estado da sessao
              </p>
              <div className="grid gap-2 text-sm text-zinc-200">
                <div className="rounded-lg border border-white/15 bg-black/20 px-3 py-2">
                  Tema: <span className="font-semibold text-white">{selectedStoryTheme.title}</span>
                </div>
                <div className="rounded-lg border border-white/15 bg-black/20 px-3 py-2">
                  Progresso: <span className="font-semibold text-white">{Math.round(progress)}%</span>
                </div>
                <div className="rounded-lg border border-white/15 bg-black/20 px-3 py-2">
                  Fe: <span className="font-semibold text-white">{`${fate > 0 ? "+" : ""}${fate}`}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-4 text-xs text-zinc-400">
            © {new Date().getFullYear()} MiniRPG • Fe, estrategia e batalha espiritual.
          </div>
        </footer>
      </div>
    </main>
  );
}
