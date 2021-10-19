
describe('Should checkout inputs', () => {
    it('Should all inputs', () => {
        cy.visit('http://localhost:4200/adicionar');
        cy.preencheInputs();

        cy.route('POST', '**/pessoa')
            .as('postPessoa');

        cy.get('button')
            .click();

        cy.intercept('**/pessoa', (req) => {
            req.reply({
                statusCode: 201,
                body: {
                    nome: 'teste',
                    sexo: 'masculino',
                    cep: '91750620',
                    numero: 10
                }
            })
        })

        cy.wait('@postPessoa').then((xhr) => {
            expect(xhr.status).be.eq(201);
        })

    })
})