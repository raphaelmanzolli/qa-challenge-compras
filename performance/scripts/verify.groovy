def save = props.get('qa.save')
if (!props.get('qa.ready')) {
    if (save) save('consistencia.json', [ok: false, error: 'Preparação incompleta.'])
    return
}
def states = props.get('qa.states')
def checks = []
try {
    if (props.getProperty('scenario') == 'bids') {
        for (state in states) {
            def history = props.get('qa.http')('GET', "/api/compras/${state.id}/lances", props.get('qa.buyer'))
            def normalize = { bid ->
                if (!bid.id || !bid.fornecedorId || !bid.createdAt || !(bid.sequencia instanceof Number)) {
                    throw new IllegalStateException('Lance sem identidade, fornecedor, horario ou sequencia do servidor.')
                }
                [id: bid.id, value: new BigDecimal(bid.valorUnitario.toString()).stripTrailingZeros(), supplier: bid.fornecedorId,
                    time: java.time.Instant.parse(bid.createdAt), sequence: bid.sequencia.longValue()]
            }
            if (!(history instanceof List)) throw new IllegalStateException('Historico de lances nao e uma lista.')
            def accepted = state.acceptedBids.collect(normalize)
            def persisted = history.collect(normalize)
            boolean uniqueIds = accepted*.id.toSet().size() == accepted.size() && persisted*.id.toSet().size() == persisted.size()
            boolean sameBids = uniqueIds && accepted.size() == state.accepted && persisted.size() == state.accepted &&
                accepted.collectEntries { [(it.id): it] } == persisted.collectEntries { [(it.id): it] }
            // Horario do servidor; sequencia desempata lances registrados no mesmo instante.
            def chronological = persisted.sort(false) { a, b -> (a.time <=> b.time) ?: (a.sequence <=> b.sequence) }
            boolean sequenceValid = chronological.withIndex().every { bid, index ->
                bid.sequence > 0 && (index == 0 || chronological[index - 1].sequence < bid.sequence)
            }
            boolean sameOrder = chronological*.id == accepted*.id && sequenceValid
            boolean decreasing = chronological.withIndex().every { bid, index ->
                bid.value > 0 && (index == 0 || chronological[index - 1].value - bid.value >= 1)
            }
            checks << [id: state.id, acceptedIncludingWarmup: state.accepted, persisted: history.size(),
                matchesAcceptedBids: sameBids, temporalOrderMatchesAccepted: sameOrder, decreasingInTime: decreasing,
                ok: sameBids && sameOrder && decreasing]
        }
    }
    int warmupErrors = states.sum { it.warmupErrors } as int
    save('consistencia.json', [ok: checks.every { it.ok } && warmupErrors == 0, warmupErrors: warmupErrors,
        checkedAt: java.time.Instant.now().toString(), purchases: checks])
} catch (Exception error) {
    save('consistencia.json', [ok: false, error: error.message, purchases: checks])
    SampleResult.setSuccessful(false)
}
