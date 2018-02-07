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
import clipboard from "clipboard-js";
import mtz from "moment-timezone";

const { TextArea } = Input;
const { Option } = Select;

export default class EventCard extends Component {
  onSave = kv => {
    this.props.channel.push(`edit-${this.props.id}`, kv);
    this.setState({ saving: true });
  };

  onTypeChange = val =>
    this.props.channel.push(`edit-${this.props.id}`, ["type", val]);
  onTagsChange = vals => this.props.channel.push(`tags-${this.props.id}`, vals);
  onCalendarChange = vals =>
    this.props.channel.push(`calendars-${this.props.id}`, vals);

  constructInitial = (state, modifySaving) => () =>
    this.setState(
      Object.assign(
        {
          [state]: true
        },
        modifySaving ? { saving: true } : {}
      )
    );

  constructSetMessage = messageName => e =>
    this.setState({ [messageName]: e.target.value });
  constructFinishProcess = (state, messageName, channelEvent) => () => {
    if (this.state[messageName] == "") {
      this.setState({ [state]: "error" });
    } else {
      this.props.channel.push(`${channelEvent}-${this.props.id}`, {
        message: this.state[messageName]
      });
      this.setState({ [state]: false });
    }
  };

  reject = this.constructInitial("rejecting", true);
  cancel = this.constructInitial("canceling", true);
  messageAttendees = this.constructInitial("messagingAttendees", false);
  messageHost = this.constructInitial("messagingHost", false);

  setCancelMessage = this.constructSetMessage("cancelMessage");
  setRejectionMessage = this.constructSetMessage("rejectionMessage");
  setHostMessage = this.constructSetMessage("hostMessage");
  setAttendeeMessage = this.constructSetMessage("attendeeMessage");

  finishMessageAttendees = this.constructFinishProcess(
    "messagingAttendees",
    "attendeeMessage",
    "message-attendees"
  );
  finishMessageHost = this.constructFinishProcess(
    "messagingHost",
    "hostMessage",
    "message-host"
  );

  rejectWithMessage = () =>
    this.props.channel.push(`action-${this.props.id}`, {
      status: "rejected",
      message: this.state.rejectionMessage
    });

  cancelWithMessage = () => {
    this.setState({ saving: true });
    this.props.channel.push(`action-${this.props.id}`, {
      status: "cancelled",
      message: this.state.cancelMessage
    });

    this.setState({ saving: true });
  };

  cancelStage2 = () => {
    if (this.state.cancelMessage == "") {
      this.setState({ canceling: "error" });
    } else {
      this.setState({ verifyingCancel: true, canceling: false, saving: false });
    }
  };

  confirm = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      status: "confirmed"
    });
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
    rejectionMessage: "",
    cancelMessage: "",
    attendeeMessage: "",
    hostMessage: "",
    rejecting: false,
    canceling: false,
    verifyingCancel: false,
    messagingAttendees: false,
    messagingHost: false
  };

  componentWillReceiveProps(_nextProps) {
    this.state.saving = false;
  }

  render() {
    const { event, category } = this.props;

    const {
      title,
      tags,
      capacity,
      status,
      name,
      description,
      summary,
      instructions,
      location,
      start_date,
      end_date,
      contact,
      type,
      rsvp_download_url,
      attendance_count,
      browser_url,
      checked_out_by
    } = event;

    const disabled = checked_out_by !== undefined && checked_out_by !== null;

    console.log(this.state.messageAttendees);

    const isVolEvent =
      tags.filter(t => t.includes("Source: Direct Publish")).length == 0;

    const isDirectPublish =
      tags.filter(t => t.includes("Source: Direct Publish")).length > 0;

    return (
      <Card
        title={
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={title}
            attr="title"
          />
        }
        extra={
          <div style={{ display: "flex" }}>
            {this.state.saving ? (
              <div>
                {" "}
                <Icon type="loading" /> Saving{" "}
              </div>
            ) : disabled ? (
              <div>
                <Icon type="lock" /> Being edited by {checked_out_by}
              </div>
            ) : (
              [
                <span> {attendance_count || 0} RSVPs </span>,
                <div style={{ marginLeft: 30 }}>{this.renderButtons()}</div>
              ]
            )}
          </div>
        }
        style={{ width: "100%", marginTop: 25 }}
        bodyStyle={{
          display: "flex",
          flexWrap: "wrap",
          width: "100%",
          height: 500,
          overflowY: "scroll"
        }}
      >
        <Modal
          visible={this.state.rejecting}
          title="Why are you rejecting the event?"
          okText="Reject and Send"
          onCancel={() => this.setState({ rejecting: false })}
          onOk={this.rejectWithMessage}
        >
          <p>
            Check for typos – this rejection message will be sent directly to
            the event host.
          </p>
          <TextArea
            rows={5}
            onChange={this.setRejectionMessage}
            value={this.state.rejectionMessage}
          />
        </Modal>

        <Modal
          visible={this.state.canceling}
          title="Why are you cancelling this event?"
          okText="Cancel"
          cancelText="Don't Cancel"
          onCancel={() =>
            this.setState({ canceling: false, verifyingCancel: false })
          }
          onOk={this.cancelStage2}
        >
          {`This message will be sent to all ${attendance_count} people who have already RSVPed`}
          {this.state.canceling == "error" && (
            <span style={{ color: "red" }}>
              {" "}
              Oops! Look like you forgot to put something here.{" "}
            </span>
          )}
          <TextArea
            rows={5}
            onChange={this.setCancelMessage}
            value={this.state.cancelMessage}
          />
        </Modal>

        <Modal
          visible={this.state.verifyingCancel}
          title="Are you sure?"
          okText={this.state.saving ? "working..." : "Cancel Irreversibly"}
          okType="danger"
          onCancel={() =>
            this.setState({ cancelling: false, verifyingCancel: false })
          }
          cancelText="Don't Cancel"
          onOk={this.cancelWithMessage}
        >
          This cannot be undone.
        </Modal>

        <Modal
          visible={this.state.messagingHost}
          title={`Message the Event Host (${contact.email_address})`}
          okText="Send"
          okType="primary"
          onCancel={() =>
            this.setState({ messagingHost: false, hostMessage: "" })
          }
          cancelText="Cancel"
          onOk={this.finishMessageHost}
        >
          <TextArea
            rows={5}
            onChange={this.setHostMessage}
            value={this.state.hostMessage}
          />
        </Modal>

        <Modal
          visible={this.state.messagingAttendees != false}
          title={`Message All ${attendance_count} Attendees `}
          okText="Send"
          okType="primary"
          onCancel={() =>
            this.setState({ messagingAttendees: false, attendeeMessage: "" })
          }
          cancelText="Cancel"
          onOk={this.finishMessageAttendees}
        >
          {this.state.messagingAttendees == "error" && (
            <span style={{ color: "red" }}>
              {" "}
              Oops! Look like you forgot to put something here.{" "}
            </span>
          )}
          <TextArea
            rows={5}
            onChange={this.setAttendeeMessage}
            value={this.state.attendeeMessage}
          />
        </Modal>

        <div>
          {isDirectPublish && (
            <Button disabled={true} style={{ cursor: "none", color: "green" }}>
              Direct Published
            </Button>
          )}
        </div>

        <br />
        <br />

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Link:</strong>
          <div>
            <a target="_blank" href={browser_url}>
              {browser_url}
            </a>
          </div>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Capacity:</strong> (set to 0 for unlimited)
          <div>
            <EditableNumber
              disabled={disabled}
              value={capacity}
              attr="capacity"
              onSave={this.onSave}
              checkout={this.checkout}
              checkin={this.checkin}
            />
          </div>
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: "100%" }}
        >
          <strong>Description:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={description}
            attr="description"
            textarea={true}
          />
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: "100%" }}
        >
          <strong>Instructions:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={instructions}
            attr="instructions"
            textarea={true}
          />
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: "100%" }}
        >
          <strong>Type:</strong>{" "}
          <Select
            defaultValue={type}
            style={{ width: 300 }}
            onChange={this.onTypeChange}
          >
            {this.props.typeOptions.map(o => <Option value={o}>{o}</Option>)}
          </Select>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Date and Time</strong> <br />
          <EditableDateRange
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            start_date={start_date}
            end_date={end_date}
            time_zone={location.time_zone}
            time_zone_display={location.time_zone}
            onSave={this.onSave}
            attr="start_date"
          />
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Location</strong>
          <br />
          <strong>Venue:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.venue}
            attr="location.venue"
          />
          <br />
          <strong>Address:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.address_lines[0]}
            attr="location.address_lines[0]"
          />
          <br />
          <strong>City:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.locality}
            attr="location.locality"
          />
          <br />
          <strong>State:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.region}
            attr="location.region"
          />
          <br />
          <strong>Zip:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.postal_code}
            attr="location.postal_code"
          />
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
          <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
            <strong>Tags:</strong>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder="Tags"
              onChange={this.onTagsChange}
              defaultValue={tags.filter(
                t => !t.includes("Calendar") && !t.includes("Event Type:")
              )}
            >
              {window.tagOptions
                .filter(
                  t => !t.includes("Event: Action") && !t.includes("Calendar")
                )
                .map(t => <Option key={t}>{t}</Option>)}
            </Select>
          </div>
        )}

        <br />
        <br />

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
      event: { rsvp_download_url, organizer_edit_url }
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

            <Menu.Item>
              <Button style={{ width: "100%" }} onClick={this.messageAttendees}>
                Message Attendees
              </Button>
            </Menu.Item>

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

            {this.props.event.candidate_events_url && (
              <Menu.Item>
                <Button
                  style={{ width: "100%" }}
                  onClick={() =>
                    clipboard
                      .copy(this.props.event.candidate_events_url)
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
        category == "ESM Call"
          ? [
              <Button onClick={this.cancel} type="danger">
                Cancel
              </Button>,
              <Button onClick={this.makeTentative} type="default">
                Back to Tentative
              </Button>,
              <Button onClick={this.markLogistics} type="primary">
                Mark Called
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
        category == "Ready to Go"
          ? [
              <Button onClick={this.cancel} type="default">
                Cancel
              </Button>,
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
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
