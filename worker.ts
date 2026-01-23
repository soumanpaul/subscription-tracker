import { Worker, Queue} from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis()
const stepQueue = new Queue("workflow-steps", { connection })

const worker = new Worker("Worker-steps", async job => {
    if(job.name === "step1") {
        const { initialData } = job.data;
        // do step1 processing
        const step1Result = await doStep1(initialData)

        // enqueue step with step1 result
        await stepQueue.add("step2", { step1Result }, { removeOnComplete: true});
        return step1Result;
    }

    if(job.name === "step2") {
        const { step1Result } = job.data;
        const step2Result = await doStep2(step1Result);
        // finish workflow, persist results
        await saveWorkflowResult(step1Result);
        return step2Result;
    }
});

async function doStep1(data:any) {
    return {x: 1}
}
async function doStep2(data:any) {
    return {x: 2}
}
async function saveWorkflowResult(r:any) {
    // Write to DB
}