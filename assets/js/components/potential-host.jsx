import React, { Component } from "react";
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Icon,
  Input,
  Layout,
  Menu,
  Modal,
  Tabs,
  Select,
  message
} from "antd";
import EditableText from "./editable-text";
import EditableNumber from "./editable-number";
import EditableDateRange from "./editable-date-range";
import CallLogs from "./call-logs";
import EditLogs from "./edit-logs";

const { TextArea } = Input;
const { Option } = Select;

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

    const { contact, type } = ph;

    const disabled = true;

    return (
      <Card
        title={
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={contact.name}
            attr="title"
          />
        }
        extra={
          <div style={{ display: "flex" }}>
            <div style={{ marginLeft: 30 }}>{this.renderButtons()}</div>
          </div>
        }
        style={{ width: "100%", marginTop: 25 }}
        bodyStyle={{
          display: "flex",
          flexWrap: "wrap",
          width: "100%",
          height: 300,
          overflowY: "scroll"
        }}
      >
        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: "100%" }}
        >
          <strong>Type:</strong>
          {type}
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Host</strong>
          <br />
          <strong>Name:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={contact.name}
            attr="contact.name"
          />
          <br />
          <strong>Phone Number:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={contact.phone_number}
            attr="contact.phone_number"
          />
          <br />
          {/* <Checkbox
            checked={contact.public}
            onChange={e => this.onSave(["contact.public", e.target.checked])}
          >
            Phone Public?
          </Checkbox> */}
          {/* <br />
          <br /> */}
          <strong>Email Address:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={contact.email_address}
            attr="contact.email_address"
          />
        </div>

        {!this.props.hostEdit && (
          <div>
            <EditLogs
              id={this.props.id}
              channel={this.props.channel}
              edits={this.props.edits}
            />
            <CallLogs
              id={this.props.id}
              channel={this.props.channel}
              calls={this.props.calls}
            />
          </div>
        )}
      </Card>
    );
  }

  renderButtons() {
    const {
      category,
      ph: { rsvp_download_url, organizer_edit_url }
    } = this.props;

    return [
      <Dropdown
        overlay={
          <Menu>
            {category !== undefined && (
              <Menu.Item>
                <Button style={{ width: "100%" }} onClick={this.messageHost}>
                  Message Host
                </Button>
              </Menu.Item>
            )}

            {category !== undefined && (
              <Menu.Item>
                <Button
                  style={{ width: "100%" }}
                  onClick={this.messageAttendees}
                >
                  Message Attendees
                </Button>
              </Menu.Item>
            )}

            <Menu.Item>
              <Button
                style={{ width: "100%" }}
                onClick={() => window.open(rsvp_download_url)}
              >
                Download RSVPs
              </Button>
            </Menu.Item>

            <Menu.Item>
              <Button
                style={{ width: "100%" }}
                onClick={() =>
                  clipboard
                    .copy(rsvp_download_url)
                    .then(() =>
                      message.success("RSVP download link copied to clipboard")
                    )
                }
              >
                Copy RSVP Download Link
              </Button>
            </Menu.Item>

            <Menu.Item>
              <Button
                style={{ width: "100%" }}
                onClick={() =>
                  clipboard
                    .copy(organizer_edit_url)
                    .then(() =>
                      message.success("Organizer edit link copied to clipboard")
                    )
                }
              >
                Copy Organizer Edit Link
              </Button>
            </Menu.Item>

            {this.props.ph.candidate_phs_url && (
              <Menu.Item>
                <Button
                  style={{ width: "100%" }}
                  onClick={() =>
                    clipboard
                      .copy(this.props.ph.candidate_phs_url)
                      .then(() =>
                        message.success(
                          "Organizer edit link copied to clipboard"
                        )
                      )
                  }
                >
                  Copy Candidate Events View Link
                </Button>
              </Menu.Item>
            )}

            <Menu.Item>
              <Button style={{ width: "100%" }} onClick={this.duplicate}>
                Duplicate
              </Button>
            </Menu.Item>
          </Menu>
        }
      >
        <Button>
          More <Icon type="down" />
        </Button>
      </Dropdown>
    ]
      .concat(
        category == "ESM Call #1"
          ? [
              <Button onClick={this.reject} type="danger">
                Reject
              </Button>,
              <Button onClick={this.markCalled} type="default">
                Mark Called
              </Button>,
              <Button onClick={this.markCalledAndConfirm} type="primary">
                Mark Called and Confirm Event
              </Button>
            ]
          : []
      )
      .concat(
        category == "Needs Approval"
          ? [
              <Button onClick={this.reject} type="danger">
                Reject
              </Button>,
              <Button onClick={this.confirm} type="primary">
                Confirm
              </Button>
            ]
          : []
      )
      .concat(
        category == "Needs Logistics"
          ? [
              <Button onClick={this.cancel} type="danger">
                Cancel
              </Button>,
              <Button onClick={this.markLogistics} type="primary">
                Mark Did Logistics Call
              </Button>
            ]
          : []
      )
      .concat(
        category == "Needs Debrief"
          ? [
              <Button onClick={this.markDebriefed} type="primary">
                Mark Debriefed
              </Button>
            ]
          : []
      )
      .concat(
        category == "Rejected"
          ? [
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
              </Button>
            ]
          : []
      )
      .concat(
        category == "Cancelled"
          ? [
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
              </Button>
            ]
          : []
      )
      .concat(
        category == "Upcoming"
          ? [
              <Button onClick={this.cancel} type="danger">
                Cancel
              </Button>,
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
              </Button>
            ]
          : []
      )
      .concat(
        category == "Today"
          ? [
              <Button onClick={this.cancel} type="danger">
                Cancel
              </Button>,
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
              </Button>
            ]
          : []
      )
      .concat(
        category == undefined && [
          <Button onClick={this.cancel} type="danger">
            Cancel
          </Button>
        ]
      );
  }
}
