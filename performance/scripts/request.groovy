// Cada thread reutiliza sua compra e seu contador entre aquecimento e medição.
def state = props.get('qa.states')[ctx.threadNum]
vars.put('purchaseId', state.id.toString())
if (props.getProperty('scenario') == 'bids') {
    int value = state.nextValue--
    if (value <= 0) throw new IllegalStateException('Valores de lance esgotados.')
    vars.put('bidValue', value.toString())
    vars.put('token', props.get('qa.suppliers')[state.sequence++ % 2])
} else {
    vars.put('token', props.get('qa.buyer'))
}
