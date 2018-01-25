import React, { Component } from "react";
import { Button, Icon, Input, Modal, Table } from "antd";
import mtz from "moment-timezone";

const { TextArea } = Input;

export default class CallLogs extends Component {
  state = {
    call_logs: [],
    open: false,
    adding: false,
    logNote: ""
  };

  componentDidMount() {
    this.props.channel.push(`call-logs-for-${this.props.id}`);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({adding: false})
  }

  openMe = () => this.setState({ open: true });
  addCallLog = () =>
    this.props.channel.push(`add-call-log-${this.props.id}`, {
      note: this.state.logNote
    });

  setLogNote = e => this.setState({ logNote: e.target.value });

  render() {
    if (!this.state.open) {
      return (
        <Button type="primary" onClick={this.openMe}>
          Call Logs
        </Button>
      );
    } else if (this.state.adding) {
      return (
        <Modal
          visible={this.state.adding}
          title="Add Call Notes"
          okText="Record Call with Note"
          onCancel={() => this.setState({ adding: false })}
          onOk={this.addCallLog}
        >
          <TextArea
            rows={5}
            onChange={this.setLogNote}
            value={this.state.logNote}
            pageSize={5}
            pagination={{pageSize: 5, total: Math.ceil(this.props.calls.length / 5), defaultCurrent: 1}}
          />
        </Modal>
      );
    } else {
      return (
        <Modal
          visible={true}
          title="Call Notes"
          okText="Add Call"
          onCancel={() => this.setState({ open: false })}
          onOk={() => this.setState({ adding: true })}
        >
          <Table
            columns={[
              { title: "Caller", dataIndex: "actor", key: "actor" },
              { title: "Called At", dataIndex: "timestamp", key: "timestamp" },
              { title: "Notes", dataIndex: "note", key: "note" }
            ]}
            dataSource={this.props.calls}
          />
        </Modal>
      );
    }
  }
}

<Icon type="loading" />;
