import * as k8s from "@pulumi/kubernetes";
import * as pulumi  from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { Address } from "@pulumi/gcp/compute";

/*
What's the minimum amount of data to pass in?

Other resources
CloudSql Database (optional)
Bucket
Static IP Address?
DNS? (Optional)
License Key
Kubeconfig
TLS
OIDC?

*/

class GCPPach extends pulumi.ComponentResource {

    constructor(name: string, args: { enterpriseLisenseKey: pulumi.Input<string> }, opts?: pulumi.ComponentResourceOptions) {

        super("pachyderm:index:instance", name, args, opts);

        const bucket = new gcp.storage.Bucket(`${name}-bucket`, { location: "US", forceDestroy: true },{ parent: this } );

        const ip = new gcp.compute.Address(`${name}-static`, {}, { parent: this });
        
        const ns = new k8s.core.v1.Namespace(`${name}-pach`, { metadata: { name } }, { parent: this } );

        const helmRelease = this.constructHelmRelease(name, args.enterpriseLisenseKey, ns, ip, bucket );

        // Create a property for the bucket name that was created
        //this.bucketName = siteBucket.bucket,

        // Register that we are done constructing the component
        this.registerOutputs({
            pachIp: ip.address,
        })
    }

    private constructHelmRelease(name: string, enterpriseLicenseKey: pulumi.Input<string>, ns: k8s.core.v1.Namespace, ip: gcp.compute.Address, bucket: gcp.storage.Bucket): k8s.helm.v3.Release {
        return new k8s.helm.v3.Release(
            "pach-release",
            {
                chart: "pachyderm",
                namespace: ns.metadata.name,
                repositoryOpts: {
                    repo: "https://pachyderm.github.io/helmchart",
                },
                values: {
                    proxy: {
                        enabled: true,
                        host: ip.address,
                        service: {
                            type: "LoadBalancer",
                            loadBalancerIP: ip.address,
                        },
                    },
                    pachd: {
                        enterpriseLicenseKey,
                        storage: {
                            google: {
                                bucket: bucket.name,
                            },
                        },
                    },
                    deployTarget: "GOOGLE",
                },
            }, { parent: this, dependsOn: [ns, ip, bucket]});
    }
}

export default GCPPach;