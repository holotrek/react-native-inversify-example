import { Container, inject, injectable } from "inversify";

class FakeLocalStorage {
  private _storage: { [key: string]: string } = {};
  async getItem(key: string): Promise<string> {
    return Promise.resolve(this._storage[key]);
  }
  async setItem(key: string, item: string) {
    this._storage[key] = item;
    return Promise.resolve();
  }
}

@injectable()
class Katana {
  public damage: number = 10;
}

interface Combatant {
  katana: Katana;
  stealth: number;
  power: number;
}

@injectable()
class Ninja implements Combatant {
  stealth = 10;
  power = 5;
  constructor(@inject(Katana) public katana: Katana) {}
}

@injectable()
class Samurai implements Combatant {
  stealth = 5;
  power = 10;
  constructor(@inject(Katana) public katana: Katana) {}
}

@injectable()
class CombatantService {
  private _storage = new FakeLocalStorage();

  constructor(
    @inject(Ninja) public ninja: Ninja,
    @inject(Samurai) public samurai: Samurai
  ) {}

  async chooseCombatant(type: "ninja" | "samurai") {
    await this._storage.setItem("type", type);
  }

  async getCombatant(): Promise<Combatant> {
    const type = await this._storage.getItem("type");
    return type == "ninja" ? this.ninja : this.samurai;
  }
}

const container: Container = new Container();

container.bind(Katana).toSelf();
container.bind(Ninja).toSelf();
container.bind(Samurai).toSelf();
container.bind(CombatantService).toSelf();

const GET_COMBATANT_CHOICE_TYPE = Symbol.for("GetCombatantChoiceType");
container.bind<Promise<Combatant>>(GET_COMBATANT_CHOICE_TYPE).toResolvedValue(
  async (combatantService: CombatantService) => {
    return await combatantService.getCombatant();
  },
  [CombatantService]
);

const CURRENT_COMBATANT_TYPE = Symbol.for("CurrentCombatant");
container.bind<Combatant>(CURRENT_COMBATANT_TYPE).toResolvedValue(
  (combatant: Combatant) => {
    return combatant;
  },
  [GET_COMBATANT_CHOICE_TYPE]
);

async function RunTest() {
  const combatantService = container.get(CombatantService);

  await combatantService.chooseCombatant("ninja");
  const expectedNinja = container.get<Combatant>(GET_COMBATANT_CHOICE_TYPE);
  console.log(
    `Expected Ninja with power=5;stealth=10. Actual: power=${expectedNinja.power};stealth=${expectedNinja.stealth}`
  );

  await combatantService.chooseCombatant("samurai");
  const expectedSamurai = container.get<Combatant>(GET_COMBATANT_CHOICE_TYPE);
  console.log(
    `Expected Samurai with power=10;stealth=5. Actual: power=${expectedSamurai.power};stealth=${expectedSamurai.stealth}`
  );
}

RunTest();

export { container };
