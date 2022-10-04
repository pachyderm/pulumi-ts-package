import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import  GCPPach  from "./gcp-pach";

const cfg = new pulumi.Config();
const slug = "pachyderm/ci-cluster/dev";
const stackRef = new pulumi.StackReference(slug);

const kubeConfig = stackRef.getOutput("kubeconfig");

const clusterProvider = new k8s.Provider("k8sprovider", {
  kubeconfig: kubeConfig,
});

const enterpriseLisenseKey = cfg.requireSecret("enterpriseLisenceKey")

const p = new GCPPach("p",  { enterpriseLisenseKey }, { providers: { kubernetes: clusterProvider}});
