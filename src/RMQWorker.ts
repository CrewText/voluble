import { EventEmitter } from "events"
import RedisSMQ = require("rsmq")

export class RMQWorker extends EventEmitter {
    private queue_name: string
    private continue_check: boolean
    private rsmq: RedisSMQ

    constructor(queue_name: string, rsmq: RedisSMQ) {
        super()
        this.continue_check = false
        this.queue_name = queue_name
        this.rsmq = rsmq

        this.checkQueueExists(queue_name)
            .then((queue_exists) => {
                if (!queue_exists) {
                    this.rsmq.createQueueAsync({
                        qname: queue_name
                    })
                }
            })
            .then(() => {
                return this
            })
    }

    public async start(): Promise<void> {
        this.continue_check = true

        while (this.continue_check) {

            const msgRecvProm: Promise<RedisSMQ.QueueMessage | Record<string, unknown>> = new Promise((res, _) => {
                this.rsmq.receiveMessageAsync({ qname: this.queue_name })
                    .then(m => {
                        if (m["id"]) {
                            res(m)
                        }
                    })

            })
            const timeoutProm = new Promise((_, rej) => {
                const wait = setTimeout(() => {
                    clearTimeout(wait);
                    rej(new TimeoutError())
                }, 5000)
            })

            await Promise.race([msgRecvProm, timeoutProm])
                .then((message: RedisSMQ.QueueMessage) => {

                    if (message?.id) { this.emit('message', message.message, () => { this.rsmq.deleteMessageAsync({ id: (message as RedisSMQ.QueueMessage).id, qname: this.queue_name }) }, message.id) }
                })
                .catch(e => {
                    if (!(e instanceof TimeoutError)) {
                        console.error(e)
                    }
                })
        }
    }

    public stop(): void {
        this.continue_check = false
    }

    private checkQueueExists(queue_name: string) {
        return this.rsmq.listQueuesAsync()
            .then((queues) => {
                return queues.includes(queue_name)
            })
    }

}

class TimeoutError extends Error { constructor(m?: string) { super(m); Object.setPrototypeOf(this, TimeoutError.prototype) } }