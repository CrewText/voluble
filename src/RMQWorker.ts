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
            let msg: RedisSMQ.QueueMessage | Record<string, unknown>

            setTimeout(async () => { msg = await this.rsmq.receiveMessageAsync({ qname: this.queue_name }) }, 5000)
            if ("id" in msg) {
                this.emit('message', msg.message, () => { this.rsmq.deleteMessageAsync({ id: (msg as RedisSMQ.QueueMessage).id, qname: this.queue_name }) }, msg.id)
            }
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