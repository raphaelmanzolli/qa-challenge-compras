import groovy.json.JsonSlurper

def state = props.get('qa.states')[ctx.threadNum]
boolean bids = props.getProperty('scenario') == 'bids'
// Contar todo 201, mesmo quando o corpo estiver inválido, para conferir persistência.
if (bids && prev.responseCode == '201') state.accepted++
try {
    assert prev.responseCode == (bids ? '201' : '200') : "HTTP inesperado: ${prev.responseCode}"
    def body = new JsonSlurper().parseText(prev.responseDataAsString)
    if (bids) {
        state.acceptedBids << [id: body.id, valorUnitario: body.valorUnitario,
            fornecedorId: body.fornecedorId, createdAt: body.createdAt, sequencia: body.sequencia]
        assert body.id && body.compraId == state.id
        assert new BigDecimal(body.valorUnitario.toString()) == new BigDecimal(vars.get('bidValue'))
    } else if (prev.sampleLabel.contains('listagem')) {
        assert body.content instanceof List
    } else if (prev.sampleLabel.contains('historico')) {
        assert body.compraId == state.id && body.eventos instanceof List
    } else {
        assert body.id == state.id
    }
} catch (Throwable error) {
    AssertionResult.setFailure(true)
    // Não incluir resposta nem cabeçalhos de autenticação na mensagem persistida.
    AssertionResult.setFailureMessage('Status ou JSON divergente do contrato esperado; consultar traceId no servidor.')
    if (ctx.threadGroup.name == 'Aquecimento') state.warmupErrors++
}
