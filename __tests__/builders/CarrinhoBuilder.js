import { Carrinho } from '../../src/domain/Carrinho.js';
import { Item } from '../../src/domain/Item.js';
import { UserMother } from './UserMother.js';

/**
 * Data Builder: monta um Carrinho com valores padrão sensatos
 * e permite customizar apenas o que importa para cada cenário de teste.
 *
 * Padrão: usuário padrão + 1 item de R$ 100,00.
 */
export class CarrinhoBuilder {
    constructor() {
        this.user = UserMother.umUsuarioPadrao();
        this.itens = [new Item('Produto Padrão', 100)];
    }

    comUser(user) {
        this.user = user;
        return this;
    }

    comItens(itens) {
        this.itens = itens;
        return this;
    }

    comItem(nome, preco) {
        this.itens = [...this.itens, new Item(nome, preco)];
        return this;
    }

    // Atalho: substitui os itens por um único item com o valor total desejado.
    comValorTotal(valor) {
        this.itens = [new Item('Item', valor)];
        return this;
    }

    vazio() {
        this.itens = [];
        return this;
    }

    build() {
        return new Carrinho(this.user, this.itens);
    }
}
