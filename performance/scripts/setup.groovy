import groovy.json.JsonOutput
import groovy.json.JsonSlurper

// Preparação fora dos samplers HTTP medidos. Nunca salvar tokens nas evidências.
def output = new File(props.getProperty('output_dir', 'resultados/jmeter-manual'))
output.mkdirs()
def save = { String name, Object data ->
    new File(output, name).setText(JsonOutput.prettyPrint(JsonOutput.toJson(data)), 'UTF-8')
}
props.put('qa.save', save)
props.put('qa.ready', false)
try {
    def host = props.getProperty('host', 'localhost')
    if (!(host in ['localhost', '127.0.0.1', '[::1]'])) {
        throw new IllegalArgumentException('Somente host HTTP local é permitido.')
    }
    def integer = { String name, int fallback, int minimum, int maximum ->
        int value = Integer.parseInt(props.getProperty(name, fallback.toString()))
        if (value < minimum || value > maximum) throw new IllegalArgumentException("Parâmetro inválido: ${name}")
        value
    }
    int port = integer('port', 8080, 1, 65535)
    int users = integer('users', 1, 1, 100)
    int duration = integer('duration', 15, 1, 600)
    int warmup = integer('warmup', 5, 1, 60)
    int timeout = integer('timeout', 5000, 100, 30000)
    integer('think_ms', 100, 1, 10000)
    def scenario = vars.get('scenario')
    props.setProperty('scenario', scenario)
    if (!(scenario in ['read', 'bids'])) throw new IllegalArgumentException('Cenário inválido.')
    def base = "http://${host}:${port}"
    def http = { String method, String path, String token = null, Object data = null, int expected = 200 ->
        def connection = (HttpURLConnection) new URL(base + path).openConnection()
        try {
            connection.requestMethod = method
            connection.instanceFollowRedirects = false
            connection.connectTimeout = timeout
            connection.readTimeout = timeout
            if (token) connection.setRequestProperty('Authorization', 'Bearer ' + token)
            if (data != null) {
                connection.doOutput = true
                connection.setRequestProperty('Content-Type', 'application/json')
                connection.outputStream.withCloseable { it.write(JsonOutput.toJson(data).getBytes('UTF-8')) }
            }
            if (connection.responseCode != expected) {
                throw new IllegalStateException("Preparação/conferência ${path}: HTTP ${connection.responseCode}, esperado ${expected}")
            }
            connection.inputStream.withCloseable { new JsonSlurper().parse(it, 'UTF-8') }
        } finally {
            connection.disconnect()
        }
    }
    props.put('qa.http', http)
    if (http('GET', '/actuator/health').status != 'UP') throw new IllegalStateException('Aplicação indisponível.')
    def password = System.getenv('DEMO_PASSWORD') ?: 'DesafioQA@2026'
    def authenticate = { String login ->
        def result = http('POST', '/api/auth/login', null, [login: login, senha: password])
        if (!(result.token instanceof String) || !result.token) throw new IllegalStateException('Login sem token.')
        result.token
    }
    def buyer = authenticate('comprador')
    def suppliers = scenario == 'bids' ? [authenticate('fornecedor.a'), authenticate('fornecedor.b')] : []
    def states = []
    def runId = UUID.randomUUID().toString()
    for (int index = 0; index < users; index++) {
        def purchase = scenario == 'read' && index > 0 ? states[0] : http('POST', '/api/compras', buyer,
            [objeto: "JMeter ${scenario} ${runId} ${index}", descricao: 'Massa fictícia de performance', quantidade: 1, valorMaximoUnitario: 1000000], 201)
        if (!purchase.id) throw new IllegalStateException('Compra sem ID.')
        states << [id: purchase.id, nextValue: 1000000, sequence: 0, accepted: 0, acceptedBids: [], warmupErrors: 0]
        if (scenario == 'bids') http('POST', "/api/compras/${purchase.id}/publicar", buyer)
    }
    if (scenario == 'bids') {
        for (state in states) {
            long deadline = System.nanoTime() + 35_000_000_000L
            def detail
            while (true) {
                detail = http('GET', "/api/compras/${state.id}", buyer)
                if (detail.status == 'ABERTA') break
                if (detail.status != 'AGENDADA' || System.nanoTime() >= deadline) {
                    throw new IllegalStateException('Compra não abriu no prazo de preparação.')
                }
                Thread.sleep(200) // Polling condicional, fora da carga.
            }
            long remaining = java.time.Instant.parse(detail.closesAt).toEpochMilli() - java.time.Instant.parse(detail.serverNow).toEpochMilli()
            if (remaining < (duration + warmup + 30) * 1000L) {
                throw new IllegalStateException('Janela de disputa insuficiente; configure DISPUTE_DURATION_SECONDS=600.')
            }
        }
    }
    props.put('qa.states', states)
    props.put('qa.buyer', buyer)
    props.put('qa.suppliers', suppliers)
    props.put('qa.ready', true)
    save('preparacao.json', [status: 'PRONTO', scenario: scenario, host: host, port: port,
        users: users, durationSeconds: duration, warmupSeconds: warmup,
        thinkMs: props.getProperty('think_ms', '100'), timeoutMs: timeout,
        javaVersion: System.getProperty('java.version'), jmeterVersion: org.apache.jmeter.util.JMeterUtils.getJMeterVersion(),
        preparedAt: java.time.Instant.now().toString(), purchases: states.collect { [id: it.id] }])
} catch (Exception error) {
    save('preparacao.json', [status: 'INCOMPLETO', error: error.message])
    log.error('Preparação JMeter interrompida: ' + error.message)
    SampleResult.setSuccessful(false)
    ctx.engine.stopTest(true)
}
