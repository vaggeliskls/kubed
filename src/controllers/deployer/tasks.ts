import { Listr, PRESET_TIMER, ListrTask } from "listr2";
import * as _ from "lodash";

import { cliOutput } from "../../shared/cli";
import * as k8s from "../kubernetes";

import { IChartsData } from "./environment.model";

export interface Ctx {
  exitOnError: boolean;
}

export async function runHelmDeployTaskList(charts: IChartsData[]): Promise<void> {
  cliOutput.log({ title: "Helm Releases Execution" });
  let index = 1;
  const parentTasks: ListrTask[] = [];
  const groupedCharts = _.groupBy(charts, chart => chart.group);
  for (const [key, chartsList] of Object.entries(groupedCharts)) {
    const subTasks: ListrTask[] = [];
    for (const chart of chartsList) {
      const listrTask: ListrTask = {
        title: `${index}. ${chart.name}`,
        task: async (ctx: any, task: any): Promise<void> => {
          try {
            await k8s.deploy(chart);
          } catch (err) {
            throw new Error(`${task.title} -> ${err as any}`);
          }
        },
        // retry: 1,
        rendererOptions: { timer: PRESET_TIMER },
      };
      index++;
      subTasks.push(listrTask);
    }
    parentTasks.push({
      title: cliOutput.colors.green(`${key ?? "Other"}`),
      task: (ctx: any, task: any): Listr<Ctx> =>
        task.newListr(subTasks, {
          concurrent: true,
          collectErrors: "minimal",
        }),
    } as ListrTask);
  }
  const tasks = new Listr<Ctx>(parentTasks, {
    /* options */
    concurrent: false,
    collectErrors: "minimal",
    exitOnError: true,
    rendererOptions: { collapseSubtasks: false },
  });
  await tasks.run();
}

export async function runTasks(
  taskList: { name: string; asyncFunc: () => Promise<any> }[],
  msg = "Task Execution"
): Promise<void> {
  cliOutput.note({ title: msg });

  const tasks = new Listr<Ctx>([], {
    /* options */
    concurrent: true,
    collectErrors: "minimal",
    exitOnError: true,
    rendererOptions: { collapseSubtasks: false, timer: PRESET_TIMER },
  });
  let index = 1;
  for (const taskExec of taskList) {
    tasks.add({
      title: `${index}. ${taskExec.name}`,
      task: async (ctx: any, task: any): Promise<void> => {
        try {
          await taskExec.asyncFunc();
        } catch (err) {
          throw new Error(`${task.title} -> ${err as any}`);
        }
      },
    });
    index++;
  }
  await tasks.run();
}
