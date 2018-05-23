import React, { Component } from "react";
import { Button, Card, Table, message } from "antd";
import CallLogs from "./call-logs";

export default class EventCard extends Component {
  onSave = kv => {
    this.props.channel.push(`edit-${this.props.id}`, kv);
    this.setState({ saving: true });
  };

  makeTentative = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      status: "tentative"
    });
    this.setState({ saving: true });
  };

  markCalled = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      action: "called"
    });
    this.setState({ saving: true });
  };

  markCalledAndConfirm = () => {
    this.setState({ saving: true });
    this.markCalled();
    this.confirm();
  };

  markLogistics = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      action: "logisticsed"
    });
    this.setState({ saving: true });
  };

  markDebriefed = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      action: "debriefed"
    });
    this.setState({ saving: true });
  };

  duplicate = () => this.props.channel.push(`duplicate-${this.props.id}`);
  checkout = () => this.props.channel.push(`checkout-${this.props.id}`);
  checkin = () => this.props.channel.push(`checkin-${this.props.id}`);

  state = {
    rejecting: false,
    rejectionMessage: "",
    canceling: false,
    verifyingCancel: false,
    cancelMessage: "",
    attendeeMessage: "",
    hostMessage: "",
    messagingAttendees: false,
    messagingHost: false
  };

  componentWillReceiveProps(_nextProps) {
    this.state.saving = false;
  }

  render() {
    const { ph, category } = this.props;

    const { contact, type, submitted_at, submission_complete_url } = ph;
    const { name, phone_number, email_address, zip } = contact;

    const disabled = true;

    return (
      <Card
        title={contact.name}
        // extra={
        //   <div style={{ display: "flex" }}>
        //     <div style={{ marginLeft: 30 }}>
        //       <CallLogs
        //         id={this.props.id}
        //         channel={this.props.channel}
        //         calls={this.props.calls}
        //         category={this.props.category}
        //       />
        //     </div>
        //   </div>
        // }
        style={{ width: "45%", marginTop: 25 }}
        bodyStyle={{
          display: "flex",
          flexWrap: "wrap",
          width: "100%",
          height: 450,
          overflowY: "scroll"
        }}
      >
        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Submission Finish Url</strong> <br />
          <a href={submission_complete_url} target="_blank">
            {submission_complete_url}
          </a>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Submitted At:</strong>
          <div>{new Date(submitted_at).toString()}</div>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Phone Number</strong>
          <div>{phone_number}</div>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Type</strong>
          <div>{type}</div>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Email</strong>
          <div>{email_address}</div>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Zip</strong>
          <div>{zip}</div>
        </div>
      </Card>
    );
  }
}
