import { User } from '../../src/domain/User.js';

/**
 * Object Mother: fábrica de usuários "prontos" e fixos.
 * Usuários mudam pouco entre os testes, então métodos estáticos nomeados bastam.
 */
export class UserMother {
    static umUsuarioPadrao() {
        return new User(1, 'Maria Padrão', 'padrao@email.com', 'PADRAO');
    }

    static umUsuarioPremium() {
        return new User(2, 'João Premium', 'premium@email.com', 'PREMIUM');
    }
}
