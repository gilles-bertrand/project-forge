import { hashPassword, UserEntity } from "@libs/users-backend";
import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";

/**
 * E2E test seeder - creates users needed for Playwright e2e tests
 */
export class E2ESeeder extends Seeder {
  // oxlint-disable-next-line max-lines-per-function
  async run(em: EntityManager) {
    const hashedPassword = await hashPassword("123456789");

    // Utilisateur principal SprintForge — identité par défaut pour les E2E
    em.create(UserEntity, {
      id: "user-claire",
      email: "claire.dubois@sprintforge.com",
      firstName: "Claire",
      lastName: "Dubois",
      password: hashedPassword,
      role: "Developer",
      color: "#66C7B8",
      avatar: null,
    });
  }
}
