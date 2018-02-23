import React, { Component } from "react";
import { Button, Icon, Input, Modal, Table } from "antd";
import mtz from "moment-timezone";

const { TextArea } = Input;

export default class EditLogs extends Component {
  state = {
    open: false
  };

  openMe = () => {
    this.props.channel.push(`edit-logs-for-${this.props.id}`);
    this.setState({ open: true });
  };

  render() {
    if (!this.state.open) {
      return <Button onClick={this.openMe}>Edit History</Button>;
    } else {
      return (
        <Modal
          visible={true}
          title="Edit History"
          footer={[]}
          width={this.props.edits === undefined ? "" : "90%"}
          onCancel={() => this.setState({ open: false })}
        >
          {this.props.edits === undefined ? (
            <Icon type="loading" />
          ) : (
            <Table
              columns={[
                {
                  title: "Actor",
                  dataIndex: "actor",
                  key: "actor",
                  width: 300
                },
                {
                  title: "Edited At",
                  dataIndex: "edited_at",
                  key: "edited_at",
                  width: 200
                },
                { title: "Edits", dataIndex: "edits", key: "edits" }
              ]}
              dataSource={this.props.edits.map(e =>
                Object.assign(e, {
                  edited_at: new Date(e.edited_at).toString(),
                  edits: JSON.stringify(e.edit)
                })
              )}
            />
          )}
        </Modal>
      );
    }
  }
}

<Icon type="loading" />;
