import { CheckoutService } from '../src/services/CheckoutService.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';

describe('CheckoutService', () => {
    const cartaoCredito = { numero: '4111111111111111', validade: '12/30' };

    describe('quando o pagamento falha', () => {
        // Stub: única função é devolver { success: false }
        const criarGatewayStub = () => ({
            cobrar: jest.fn().mockResolvedValue({ success: false }),
        });

        it('deve retornar null (verificação de estado)', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().build();
            const gatewayStub = criarGatewayStub();
            const repositoryDummy = {}; // não deve ser chamado
            const emailDummy = {}; // não deve ser chamado
            const checkoutService = new CheckoutService(gatewayStub, repositoryDummy, emailDummy);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert
            expect(pedido).toBeNull();
        });

        it('não deve salvar o pedido nem enviar e-mail (verificação de comportamento)', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().build();
            const gatewayStub = criarGatewayStub();
            const repositoryMock = { salvar: jest.fn() };
            const emailMock = { enviarEmail: jest.fn() };
            const checkoutService = new CheckoutService(gatewayStub, repositoryMock, emailMock);

            // Act
            await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert
            expect(repositoryMock.salvar).not.toHaveBeenCalled();
            expect(emailMock.enviarEmail).not.toHaveBeenCalled();
        });
    });

    describe('quando um cliente padrão finaliza a compra', () => {
        it('deve retornar o pedido salvo sem desconto (verificação de estado)', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().comValorTotal(100).build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const repositoryStub = {
                salvar: jest.fn().mockImplementation(async (pedido) => ({ ...pedido, id: 1 })),
            };
            const emailDummy = { enviarEmail: jest.fn().mockResolvedValue(undefined) };
            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailDummy);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert
            expect(pedido.id).toBe(1);
            expect(pedido.totalFinal).toBe(100);
            expect(pedido.status).toBe('PROCESSADO');
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        const criarCenarioPremium = () => {
            const usuarioPremium = UserMother.umUsuarioPremium();
            const carrinho = new CarrinhoBuilder()
                .comUser(usuarioPremium)
                .comValorTotal(200)
                .build();

            // Stubs: controlam o fluxo, não verificamos como foram usados (exceto o valor cobrado)
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const repositoryStub = {
                salvar: jest.fn().mockResolvedValue({ id: 1, totalFinal: 180, status: 'PROCESSADO' }),
            };
            // Mock: queremos verificar SE foi chamado e COM QUAIS argumentos
            const emailMock = { enviarEmail: jest.fn().mockResolvedValue(undefined) };

            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailMock);
            return { carrinho, gatewayStub, repositoryStub, emailMock, checkoutService };
        };

        it('deve cobrar o valor com 10% de desconto', async () => {
            // Arrange
            const { carrinho, gatewayStub, checkoutService } = criarCenarioPremium();

            // Act
            await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, cartaoCredito);
        });

        it('deve enviar um único e-mail de confirmação com os dados corretos', async () => {
            // Arrange
            const { carrinho, emailMock, checkoutService } = criarCenarioPremium();

            // Act
            await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                'Pedido 1 no valor de R$180'
            );
        });
    });

    describe('quando o envio de e-mail falha', () => {
        it('não deve falhar o checkout e deve retornar o pedido salvo', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().build();
            const pedidoSalvo = { id: 7, totalFinal: 100, status: 'PROCESSADO' };
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const repositoryStub = { salvar: jest.fn().mockResolvedValue(pedidoSalvo) };
            const emailStub = { enviarEmail: jest.fn().mockRejectedValue(new Error('SMTP fora do ar')) };
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailStub);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert
            expect(pedido).toBe(pedidoSalvo);
            consoleErrorSpy.mockRestore();
        });
    });
});
