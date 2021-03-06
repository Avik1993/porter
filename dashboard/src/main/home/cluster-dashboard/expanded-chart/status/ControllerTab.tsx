import React, { Component } from 'react';
import styled from 'styled-components';
import api from '../../../../../shared/api';
import { Context } from '../../../../../shared/Context';

import ResourceTab from '../../../../../components/ResourceTab';

type PropsType = {
  controller: any,
  selectedPod: any,
  selectPod: Function,
  isLast?: boolean,
  isFirst?: boolean,
};

type StateType = {
  pods: any[],
  raw: any[],
  showTooltip: boolean[],
};

// Controller tab in log section that displays list of pods on click.
export default class ControllerTab extends Component<PropsType, StateType> {
  state = {
    pods: [] as any[],
    raw: [] as any[],
    showTooltip: [] as boolean[],
  }

  componentDidMount() {
    let { currentCluster, currentProject, setCurrentError } = this.context;
    let { controller, selectPod, isFirst } = this.props;

    let selectors = [] as string[];
    let ml = controller?.spec?.selector?.matchLabels || controller?.spec?.selector;
    let i = 1;
    let selector = '';
    for (var key in ml) {
      selector += key + '=' + ml[key];
      if (i != Object.keys(ml).length) {
        selector += ',';
      }
      i += 1;
    }
    selectors.push(selector);
    
    api.getMatchingPods('<token>', { 
      cluster_id: currentCluster.id,
      selectors,
    }, {
      id: currentProject.id
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
        setCurrentError(JSON.stringify(err));
        return
      }
      let pods = res?.data?.map((pod: any) => {
        return {
          namespace: pod?.metadata?.namespace, 
          name: pod?.metadata?.name,
          phase: pod?.status?.phase,
        }
      });
      let showTooltip = new Array(pods.length);
      for (let j = 0; j < pods.length; j ++) {
        showTooltip[j] = false;
      }
      
      this.setState({ pods, raw: res.data, showTooltip });
      
      if (isFirst) {
        selectPod(res.data[0])
      }
    })
  }

  getAvailability = (kind: string, c: any) => {
    switch (kind?.toLowerCase()) {
      case "deployment":
      case "replicaset":
        return [
          c.status?.availableReplicas || c.status?.replicas - c.status?.unavailableReplicas || 0, 
          c.status?.replicas || 0
        ]
      case "statefulset":
       return [c.status?.readyReplicas || 0, c.status?.replicas || 0]
      case "daemonset":
        return [c.status?.numberAvailable || 0, c.status?.desiredNumberScheduled || 0]
      }
  }

  getPodStatus = (status: any) => {
    if (status?.phase == 'Pending' && status?.containerStatuses !== undefined) {
      return status.containerStatuses[0].state.waiting.reason
      // return 'waiting'
    }

    if (status?.phase == 'Failed') {
      return 'failed'
    }

    if (status?.phase == 'Running') {
      let collatedStatus = 'running';

      status?.containerStatuses?.forEach((s: any) => {
        if (s.state?.waiting) {
          collatedStatus = 'waiting'
        } else if (s.state?.terminated) {
          collatedStatus = 'failed'
        }
      })
      return collatedStatus;
    }
  }

  renderTooltip = (x: string, ind: number): JSX.Element | undefined => {
    if (this.state.showTooltip[ind]) {
      return <Tooltip>{x}</Tooltip>;
    }
  }

  render() {
    let { controller, selectedPod, isLast, selectPod, isFirst } = this.props;
    let [available, total] = this.getAvailability(controller.kind, controller);
    let status = (available == total) ? 'running' : 'waiting'
    return (
      <ResourceTab
        label={controller.kind}
        name={controller.metadata.name}
        status={{ label: status, available, total }}
        isLast={isLast}
        expanded={isFirst}
      >
        {
          this.state.raw.map((pod, i) => {
            let status = this.getPodStatus(pod.status);
            return (
              <Tab 
                key={pod.metadata?.name}
                selected={selectedPod?.metadata?.name === pod?.metadata?.name}
                onClick={() => { selectPod(pod)} }
              > 
                <Gutter>
                  <Rail />
                  <Circle />
                  <Rail lastTab={i === this.state.raw.length - 1} />
                </Gutter>
                <Name
                  onMouseOver={() => {
                    let showTooltip = this.state.showTooltip;
                    showTooltip[i] = true;
                    this.setState({ showTooltip });
                  }}
                  onMouseOut={() => {
                    let showTooltip = this.state.showTooltip;
                    showTooltip[i] = false;
                    this.setState({ showTooltip });
                  }}
                >
                  {pod.metadata?.name}
                </Name>
                {this.renderTooltip(pod.metadata?.name, i)}
                <Status>
                  <StatusColor status={status} />
                  {status}
                </Status>
              </Tab>
            );
          })
        }
      </ResourceTab>
    );
  }
}

ControllerTab.contextType = Context;

const Rail = styled.div`
  width: 2px;
  background: ${(props: { lastTab?: boolean }) => props.lastTab ? '' : '#52545D'};
  height: 50%;
`;

const Circle = styled.div`
  min-width: 10px;
  min-height: 2px;
  margin-bottom: -2px;
  margin-left: 8px;
  background: #52545D;
`;

const Gutter = styled.div`
  position: absolute;
  top: 0px;
  left: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: visible;
`;

const Status = styled.div`
  display: flex;
  width: 50px;
  font-size: 12px;
  text-transform: capitalize;
  justify-content: flex-end;
  align-items: center;
  font-family: 'Work Sans', sans-serif;
  color: #aaaabb;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

const StatusColor = styled.div`
  margin-right: 7px;
  width: 7px;
  min-width: 7px;
  height: 7px;
  background: ${(props: { status: string }) => (props.status === 'running' ? '#4797ff' : props.status === 'failed' ? "#ed5f85" : "#f5cb42")};
  border-radius: 20px;
`;

const Name = styled.div`
  max-width: calc(100% - 75px);
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 16px;
  word-wrap: break-word;
  max-height: 32px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`;

const Tooltip = styled.div`
  position: absolute;
  left: 35px;
  word-wrap: break-word;
  top: 38px;
  min-height: 18px;
  max-width: calc(100% - 75px);
  padding: 2px 5px;
  background: #383842dd;
  display: flex;
  justify-content: center;
  flex: 1;
  color: white;
  text-transform: none;
  font-size: 12px;
  font-family: "Work Sans", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

const Tab = styled.div`
  width: 100%;
  height: 50px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${(props: {selected: boolean}) => props.selected ? 'white' : '#ffffff66'};
  background: ${(props: {selected: boolean}) => props.selected ? '#ffffff18' : ''};
  font-size: 13px;
  padding: 20px 19px 20px 42px;
  text-shadow: 0px 0px 8px none;
  overflow: visible;
  cursor: pointer;
  :hover {
    color: white;
    background: #ffffff18;
  }
`;